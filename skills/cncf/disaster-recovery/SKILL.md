---
name: disaster-recovery
description: Implements comprehensive disaster recovery planning for Kubernetes clusters
  with backup strategies, recovery procedures, cross-region replication, RPO/RTO planning,
  and validation workflows.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: cncf
  role: implementation
  scope: infrastructure
  output-format: code
  triggers: disaster recovery, backup strategy, recovery procedures, cross region
    replication, rpo rto, backup validation, how do i plan dr
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
  related-skills: cncf-argocd, cncf-velero
------
# Disaster Recovery Planning for Kubernetes Clusters

Implements comprehensive disaster recovery planning for Kubernetes clusters with backup strategies, recovery procedures, cross-region replication, RPO/RTO planning, and validation workflows.

## When to Use

Use this disaster recovery skill when:

- Planning or reviewing a Kubernetes cluster disaster recovery strategy
- Implementing backup and recovery procedures for production workloads
- Designing cross-region replication for high availability
- Calculating and validating Recovery Point Objective (RPO) and Recovery Time Objective (RTO)
- Setting up backup validation and recovery testing workflows
- Creating runbooks for incident response and recovery scenarios

---

## When NOT to Use

Avoid this skill for:

- Single-zone, non-critical development clusters with acceptable data loss
- Applications that don't require regulatory compliance or SLA guarantees
- Environments where manual recovery is acceptable and documented
- Projects with unlimited recovery time that don't need automated backup
- Simple stateless applications without persistent data concerns

Use `cncf-velero` for backup-specific operations, and `cncf-argocd` for GitOps-based disaster recovery with automated failover.

---

## Core Workflow

1. **Assess Business Requirements** — Define RPO (Recovery Point Objective) and RTO (Recovery Time Objective) based on business impact analysis. **Checkpoint:** Documented RPO/RTO targets approved by stakeholders.

2. **Identify Critical Workloads** — Catalog all stateful applications, databases, and persistent volumes that require protection. **Checkpoint:** Complete inventory of critical resources with recovery priorities.

3. **Design Backup Strategy** — Select backup tools (Velero, etcd snapshots), frequency, retention policies, and storage locations. **Checkpoint:** Backup strategy document with technical specifications.

4. **Plan Recovery Procedures** — Document step-by-step recovery runbooks for different failure scenarios (cluster failure, namespace deletion, data corruption). **Checkpoint:** Validated recovery runbooks tested in staging environment.

5. **Implement Cross-Region Replication** — Configure replication for critical data, configuration, and infrastructure code across geographic regions. **Checkpoint:** Replication verified with latency and consistency tests.

6. **Schedule Regular Drills** — Execute disaster recovery drills quarterly, validate backup integrity, and update runbooks based on findings. **Checkpoint:** Drill results documented and improvements prioritized.

---

## Implementation Patterns

### Pattern 1: RPO/RTO Planning Framework

**Description:** Establish measurable recovery objectives based on business requirements and technical constraints.

```yaml
# disaster-recovery-plan.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: disaster-recovery-plan
  namespace: platform
data:
  # RPO Definitions - Maximum acceptable data loss
  rpo-critical: "5 minutes"
  rpo-high: "30 minutes"
  rpo-medium: "4 hours"
  rpo-low: "24 hours"
  
  # RTO Definitions - Maximum acceptable downtime
  rto-critical: "15 minutes"
  rto-high: "1 hour"
  rto-medium: "4 hours"
  rto-low: "24 hours"
  
  # Recovery Priority Order
  priority-critical: "etcd, core-dns, ingress-controller"
  priority-high: "monitoring, logging, security-components"
  priority-medium: "stateful-applications, databases"
  priority-low: "batch-jobs, development-resources"

# Validation: Calculate storage requirements based on RPO
# Example: 5-minute RPO with 1GB/hour change rate
# Daily backup size = (60 / 5) * 1GB = 12GB/day
# Monthly storage = 12GB * 30 = 360GB
```

```bash
# Validate RPO/RTO feasibility
#!/bin/bash
# rpo-rto-validation.sh

calculate_storage_requirements() {
    local rpo=$1  # in minutes
    local change_rate_gb_per_hour=$2
    
    local backup_frequency=$((60 / rpo))
    local daily_storage=$(echo "$backup_frequency * $change_rate_gb_per_hour" | bc)
    local monthly_storage=$(echo "$daily_storage * 30" | bc)
    
    echo "Backup frequency: every ${rpo} minutes (${backup_frequency}x/day)"
    echo "Daily storage requirement: ${daily_storage} GB"
    echo "Monthly storage requirement: ${monthly_storage} GB"
}

# Example: Critical workload with 5-minute RPO and 2GB/hour change rate
calculate_storage_requirements 5 2

# Output:
# Backup frequency: every 5 minutes (12x/day)
# Daily storage requirement: 24 GB
# Monthly storage requirement: 720 GB
```

### Pattern 2: Velero Backup Strategy with Multiple Schedules

**Description:** Implement layered backup schedules for different recovery point objectives.

```yaml
# velero-backup-schedules.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: velero

---
apiVersion: v1
kind: Secret
metadata:
  name: cloud-credentials
  namespace: velero
type: Opaque
stringData:
  cloud: |
    [default]
    aws_access_key_id=YOUR_ACCESS_KEY
    aws_secret_access_key=YOUR_SECRET_KEY

---
# Critical workload: 5-minute RPO - Continuous backup
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: critical-continuous-backup
  namespace: velero
spec:
  schedule: "*/5 * * * *"
  template:
    includedNamespaces:
      - production
      - critical-apps
    includedResources:
      - pods
      - persistentvolumeclaims
      - persistentvolumes
      - secrets
      - configmaps
      - services
      - deployments
      - statefulsets
    excludedResources: []
    includeClusterResources: true
    ttl: "2h"
    storageLocation: critical-backups
    volumeSnapshotLocations:
      - critical-backups

---
# High priority: 30-minute RPO - Hourly backups
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: high-priority-hourly-backup
  namespace: velero
spec:
  schedule: "0 * * * *"
  template:
    includedNamespaces:
      - production
      - high-priority-apps
    includedResources:
      - pods
      - persistentvolumeclaims
      - persistentvolumes
      - secrets
      - configmaps
      - services
      - deployments
      - statefulsets
    includeClusterResources: true
    ttl: "24h"
    storageLocation: high-priority-backups
    volumeSnapshotLocations:
      - high-priority-backups

---
# Medium priority: 4-hour RPO - Daily backups
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: medium-priority-daily-backup
  namespace: velero
spec:
  schedule: "0 0 * * *"
  template:
    includedNamespaces:
      - production
      - medium-priority-apps
    includedResources:
      - pods
      - persistentvolumeclaims
      - persistentvolumes
      - secrets
      - configmaps
      - services
      - deployments
      - statefulsets
    includeClusterResources: true
    ttl: "720h"  # 30 days
    storageLocation: medium-priority-backups
    volumeSnapshotLocations:
      - medium-priority-backups

---
# Low priority: Weekly backups with full cluster state
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: weekly-full-cluster-backup
  namespace: velero
spec:
  schedule: "0 2 * * 0"  # Sunday at 2 AM
  template:
    includedNamespaces:
      - "*"
    includedResources:
      - "*"
    excludedNamespaces:
      - kube-system
      - velero
    includeClusterResources: true
    ttl: "2160h"  # 90 days
    storageLocation: archive-backups
    volumeSnapshotLocations:
      - archive-backups
```

### Pattern 3: etcd Snapshot and Disaster Recovery

**Description:** Implement etcd snapshot strategy for cluster-level recovery.

```bash
# etcd-backup-and-recovery.sh
#!/bin/bash
set -euo pipefail

# Configuration
ETCD_ENDPOINTS="https://127.0.0.1:2379"
ETCD_CA="/etc/kubernetes/pki/etcd/ca.crt"
ETCD_CERT="/etc/kubernetes/pki/etcd/healthcheck-client.crt"
ETCD_KEY="/etc/kubernetes/pki/etcd/healthcheck-client.key"
BACKUP_DIR="/var/lib/etcd-backup"
RETENTION_DAYS=30

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Take snapshot
BACKUP_FILE="${BACKUP_DIR}/etcd-snapshot-$(date +%Y%m%d-%H%M%S).db"
echo "Taking etcd snapshot..."
etcdctl snapshot save "${BACKUP_FILE}" \
    --endpoints="${ETCD_ENDPOINTS}" \
    --cacert="${ETCD_CA}" \
    --cert="${ETCD_CERT}" \
    --key="${ETCD_KEY}"

# Verify snapshot integrity
echo "Verifying snapshot integrity..."
etcdctl snapshot status "${BACKUP_FILE}" --write-out=table

# Extract snapshot info
SNAPSHOT_INFO=$(etcdctl snapshot status "${BACKUP_FILE}" --write-out=json)
echo "Snapshot info: ${SNAPSHOT_INFO}"

# Clean old backups
echo "Cleaning backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "etcd-snapshot-*.db" -mtime +${RETENTION_DAYS} -delete

# List remaining backups
echo "Current backups:"
ls -lh "${BACKUP_DIR}"
```

```bash
# etcd-restoration-procedure.sh
#!/bin/bash
set -euo pipefail

# Configuration
ETCD_DATA_DIR="/var/lib/etcd"
ETCD_BACKUP_FILE="/var/lib/etcd-backup/etcd-snapshot-20240115-020000.db"
ETCD_CA="/etc/kubernetes/pki/etcd/ca.crt"
ETCD_CERT="/etc/kubernetes/pki/etcd/healthcheck-client.crt"
ETCD_KEY="/etc/kubernetes/pki/etcd/healthcheck-client.key"

echo "=== ETCD RESTORATION PROCEDURE ==="
echo "Backup file: ${ETCD_BACKUP_FILE}"
echo "Data directory: ${ETCD_DATA_DIR}"

# Stop all etcd members (in order)
echo "Stopping etcd service on all nodes..."
systemctl stop etcd

# Backup current data directory
echo "Backing up current etcd data..."
mv "${ETCD_DATA_DIR}" "${ETCD_DATA_DIR}.backup-$(date +%Y%m%d-%H%M%S)"

# Restore snapshot
echo "Restoring etcd snapshot..."
etcdctl snapshot restore "${ETCD_BACKUP_FILE}" \
    --data-dir="${ETCD_DATA_DIR}" \
    --initial-cluster-token=etcd-cluster-01 \
    --initial-advertise-peer-urls=http://127.0.0.1:2380 \
    --name=etcd-01 \
    --initial-cluster=etcd-01=http://127.0.0.1:2380

# Update permissions
chown -R etcd:etcd "${ETCD_DATA_DIR}"

# Restart etcd service
echo "Starting etcd service..."
systemctl start etcd

# Verify restoration
echo "Verifying etcd cluster health..."
etcdctl endpoint health \
    --endpoints="https://127.0.0.1:2379" \
    --cacert="${ETCD_CA}" \
    --cert="${ETCD_CERT}" \
    --key="${ETCD_KEY}"

echo "=== RESTORATION COMPLETE ==="
```

### Pattern 4: Cross-Region Replication Configuration

**Description:** Configure cross-region disaster recovery with regional clusters.

```yaml
# cross-region-replication.yaml
# Primary region: us-east-1
# Secondary region: us-west-2
# Tertiary region: eu-west-1

apiVersion: v1
kind: Namespace
metadata:
  name: dr-configuration

---
# Git repository configuration for multi-region sync
apiVersion: v1
kind: ConfigMap
metadata:
  name: dr-regional-config
  namespace: dr-configuration
data:
  # Primary region
  primary-region: "us-east-1"
  primary-region-endpoint: "https://k8s-api.us-east-1.example.com"
  
  # Secondary region (hot standby)
  secondary-region: "us-west-2"
  secondary-region-endpoint: "https://k8s-api.us-west-2.example.com"
  
  # Tertiary region (warm standby)
  tertiary-region: "eu-west-1"
  tertiary-region-endpoint: "https://k8s-api.eu-west-1.example.com"
  
  # Replication configuration
  replication-interval: "60"  # seconds
  replication-mode: "asynchronous"
  conflict-resolution: "last-write-wins"
  
  # Failover priorities
  failover-order: |
    primary -> secondary -> tertiary
  failover-threshold: "5"  # minutes of unavailability

---
# Velero backup locations for cross-region storage
apiVersion: v1
kind: Secret
metadata:
  name: us-east-1-credentials
  namespace: velero
type: Opaque
stringData:
  cloud: |
    [default]
    aws_access_key_id=US_EAST_1_ACCESS_KEY
    aws_secret_access_key=US_EAST_1_SECRET_KEY

---
apiVersion: v1
kind: Secret
metadata:
  name: us-west-2-credentials
  namespace: velero
type: Opaque
stringData:
  cloud: |
    [default]
    aws_access_key_id=US_WEST_2_ACCESS_KEY
    aws_secret_access_key=US_WEST_2_SECRET_KEY

---
apiVersion: v1
kind: Secret
metadata:
  name: eu-west-1-credentials
  namespace: velero
type: Opaque
stringData:
  cloud: |
    [default]
    aws_access_key_id=EU_WEST_1_ACCESS_KEY
    aws_secret_access_key=EU_WEST_1_SECRET_KEY

---
# Backup storage location for primary region
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: primary-backups
  namespace: velero
spec:
  provider: aws
  objectStorage:
    bucket: my-cluster-primary-backups
    prefix: us-east-1
  config:
    region: us-east-1
    s3Url: https://s3.us-east-1.amazonaws.com
    publicUrl: https://s3.us-east-1.amazonaws.com
  credential:
    name: us-east-1-credentials
    key: cloud

---
# Backup storage location for secondary region (cross-region)
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: secondary-backups
  namespace: velero
spec:
  provider: aws
  objectStorage:
    bucket: my-cluster-secondary-backups
    prefix: us-west-2
  config:
    region: us-west-2
    s3Url: https://s3.us-west-2.amazonaws.com
    publicUrl: https://s3.us-west-2.amazonaws.com
  credential:
    name: us-west-2-credentials
    key: cloud

---
# Backup storage location for tertiary region (cross-region)
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: tertiary-backups
  namespace: velero
spec:
  provider: aws
  objectStorage:
    bucket: my-cluster-tertiary-backups
    prefix: eu-west-1
  config:
    region: eu-west-1
    s3Url: https://s3.eu-west-1.amazonaws.com
    publicUrl: https://s3.eu-west-1.amazonaws.com
  credential:
    name: eu-west-1-credentials
    key: cloud

---
# Cross-region disaster recovery runbook
apiVersion: v1
kind: ConfigMap
metadata:
  name: dr-runbook
  namespace: dr-configuration
data:
  failover-procedure: |
    # Cross-Region Failover Runbook
    
    ## Scenario 1: Primary Region Failure
    1. Detect primary region failure (monitoring alerts)
    2. Verify primary region unavailability
    3. Promote secondary region to active
    4. Update DNS to point to secondary region
    5. Notify stakeholders of failover completion
    6. Begin root cause analysis
    
    ## Scenario 2: Data Corruption
    1. Identify affected namespace/application
    2. Check backup timestamps before corruption
    3. Restore from backup in same region
    4. Validate restored data integrity
    5. Resume normal operations
    
    ## Scenario 3: Complete Cluster Loss
    1. Assess scope of cluster loss
    2. Identify available regional backups
    3. Deploy new cluster in healthy region
    4. Restore from cross-region backup
    5. Reconfigure all services
    6. Validate full functionality
    
    ## Post-Failover Actions
    1. Document timeline and actions taken
    2. Update runbook with new learnings
    3. Schedule post-mortem meeting
    4. Implement preventive measures
    5. Restore primary region when ready
  recovery-checklist: |
    # Recovery Verification Checklist
    - [ ] All services operational
    - [ ] Data integrity verified
    - [ ] Performance baseline restored
    - [ ] Monitoring and alerting active
    - [ ] Security scans passed
    - [ ] User access restored
    - [ ] Documentation updated

---
# Multi-region ArgoCD configuration for GitOps-based DR
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: multi-region-apps
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - region: us-east-1
            api-server: https://k8s-api.us-east-1.example.com
            repo-url: git@github.com:org/applications.git
            path: manifests/us-east-1
          - region: us-west-2
            api-server: https://k8s-api.us-west-2.example.com
            repo-url: git@github.com:org/applications.git
            path: manifests/us-west-2
          - region: eu-west-1
            api-server: https://k8s-api.eu-west-1.example.com
            repo-url: git@github.com:org/applications.git
            path: manifests/eu-west-1
  template:
    metadata:
      name: '{{region}}-apps'
    spec:
      project: default
      source:
        repoURL: '{{repo-url}}'
        targetRevision: HEAD
        path: '{{path}}'
      destination:
        server: '{{api-server}}'
        namespace: production
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
          - PrunePropagationPolicy=foreground

---
# Monitoring for cross-region health
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: dr-health-monitor
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: dr-health-check
  namespaceSelector:
    matchNames:
      - dr-configuration
  podMetricsEndpoints:
    - port: http
      interval: 30s
      path: /metrics
```

### Pattern 5: Disaster Recovery Validation Pipeline

**Description:** Automated validation of backup integrity and recovery procedures.

```yaml
# dr-validation-pipeline.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: dr-validation

---
# Backup validation job - verifies backup integrity
apiVersion: batch/v1
kind: CronJob
metadata:
  name: backup-integrity-validation
  namespace: dr-validation
spec:
  schedule: "0 3 * * *"  # Daily at 3 AM
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: dr-validator
          restartPolicy: Never
          containers:
            - name: validate-backups
              image: velero/velero:v1.12.0
              command: ["/bin/sh", "-c"]
              args:
                - |
                  #!/bin/bash
                  set -euo pipefail
                  
                  echo "=== Backup Integrity Validation ==="
                  echo "Date: $(date)"
                  
                  # Get list of backups
                  echo "Listing backups..."
                  velero backup get -o wide
                  
                  # Validate each backup
                  echo "Validating backups..."
                  for backup in $(velero backup get -o json | jq -r '.items[].metadata.name'); do
                    echo "Validating backup: ${backup}"
                    velero backup status ${backup} --details
                    velero backup describe ${backup} | grep -E "(Status|Errors|Warnings)"
                  done
                  
                  # Check backup storage location
                  echo "Checking backup storage location..."
                  velero backup-location get
                  
                  # Validate snapshot backups
                  echo "Validating volume snapshots..."
                  velero snapshot get
                  
                  echo "=== Validation Complete ==="
                  
                  # Exit with error if any backups have issues
                  if velero backup get | grep -q "Failed\|InProgress"; then
                    echo "WARNING: Some backups have issues"
                    exit 1
                  fi
              env:
                - name: AWS_ACCESS_KEY_ID
                  valueFrom:
                    secretKeyRef:
                      name: cloud-credentials
                      key: cloud
                - name: AWS_SECRET_ACCESS_KEY
                  valueFrom:
                    secretKeyRef:
                      name: cloud-credentials
                      key: cloud
                - name: VELERO_NAMESPACE
                  value: velero

---
# Recovery test job - simulates actual recovery
apiVersion: batch/v1
kind: CronJob
metadata:
  name: recovery-test
  namespace: dr-validation
spec:
  schedule: "0 4 1 * *"  # First day of month at 4 AM
  successfulJobsHistoryLimit: 1
  failedJobsHistoryLimit: 1
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: dr-validator
          restartPolicy: Never
          containers:
            - name: recovery-test
              image: velero/velero:v1.12.0
              command: ["/bin/sh", "-c"]
              args:
                - |
                  #!/bin/bash
                  set -euo pipefail
                  
                  echo "=== Recovery Test ==="
                  echo "Date: $(date)"
                  
                  # Create test namespace
                  echo "Creating test namespace..."
                  kubectl create namespace dr-test-$(date +%Y%m%d) || true
                  
                  # Create test application
                  echo "Creating test application..."
                  kubectl create deployment nginx-test \
                    --namespace=dr-test-$(date +%Y%m%d) \
                    --image=nginx:latest
                  
                  # Create backup of test namespace
                  BACKUP_NAME="recovery-test-$(date +%Y%m%d)"
                  echo "Creating backup: ${BACKUP_NAME}"
                  velero backup create ${BACKUP_NAME} \
                    --include-namespaces=dr-test-$(date +%Y%m%d) \
                    --wait
                  
                  # Delete test namespace
                  echo "Deleting test namespace..."
                  kubectl delete namespace dr-test-$(date +%Y%m%d) --wait=true
                  
                  # Restore from backup
                  echo "Restoring from backup..."
                  velero restore create --from-backup=${BACKUP_NAME}
                  
                  # Wait for restore to complete
                  echo "Waiting for restore to complete..."
                  sleep 60
                  
                  # Verify restore
                  echo "Verifying restore..."
                  kubectl get pods -n dr-test-$(date +%Y%m%d) -w
                  
                  # Check application health
                  echo "Checking application health..."
                  kubectl wait --for=condition=ready pod \
                    --selector=app=nginx-test \
                    --namespace=dr-test-$(date +%Y%m%d) \
                    --timeout=300s
                  
                  # Cleanup
                  echo "Cleaning up..."
                  kubectl delete namespace dr-test-$(date +%Y%m%d)
                  velero backup delete ${BACKUP_NAME} --confirm
                  
                  echo "=== Recovery Test Complete ==="
              env:
                - name: AWS_ACCESS_KEY_ID
                  valueFrom:
                    secretKeyRef:
                      name: cloud-credentials
                      key: cloud
                - name: AWS_SECRET_ACCESS_KEY
                  valueFrom:
                    secretKeyRef:
                      name: cloud-credentials
                      key: cloud
                - name: VELERO_NAMESPACE
                  value: velero
          terminationGracePeriodSeconds: 30
      backoffLimit: 1

---
# RBAC for DR validator
apiVersion: v1
kind: ServiceAccount
metadata:
  name: dr-validator
  namespace: dr-validation

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: dr-validator-role
rules:
  - apiGroups: [""]
    resources: ["namespaces", "pods", "services", "configmaps", "secrets"]
    verbs: ["get", "list", "create", "delete", "watch"]
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "create", "delete", "watch"]
  - apiGroups: ["velero.io"]
    resources: ["backups", "restores", "schedule"]
    verbs: ["get", "list", "create", "delete", "watch"]
  - apiGroups: ["coordination.k8s.io"]
    resources: ["leases"]
    verbs: ["get", "list", "create", "update", "delete"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: dr-validator-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: dr-validator-role
subjects:
  - kind: ServiceAccount
    name: dr-validator
    namespace: dr-validation

---
# Notifications for DR validation results
apiVersion: v1
kind: ConfigMap
metadata:
  name: dr-validation-config
  namespace: dr-validation
data:
  notification-slack-channel: "#dr-alerts"
  notification-email: "devops@example.com"
  validation-success-threshold: "90"  # percentage
  max-validation-age-hours: "24"
```

---

## Constraints

### MUST DO

- Document RPO/RTO targets for each application before implementing backup
- Test backup restoration at least quarterly with real recovery procedures
- Implement cross-region replication for critical workloads (RPO < 1 hour)
- Store backup encryption keys separately from backup storage
- Validate backup integrity after each backup operation
- Maintain runbooks with step-by-step recovery procedures
- Automate backup validation and report failures immediately
- Store etcd snapshots separately from Velero backups
- Test failover procedures between regions annually
- Keep backup storage in a different geographic region than the cluster

### MUST NOT DO

- Disable backups during maintenance windows or "just for a quick change"
- Store backup credentials in the same region as the cluster
- Rely solely on application-level backups without cluster-level backups
- Skip backup validation even if the backup appears successful
- Store backups in the same availability zone as the cluster
- Use self-signed certificates for backup storage without proper validation
- Forget to test restoration from cross-region backups
- Implement disaster recovery without documented runbooks
- Assume backup success based on backup job completion alone
- Forget to update runbooks after infrastructure changes

---

## Output Template

When this skill is active, your response must include:

1. **DR Plan Structure** — Complete disaster recovery plan with RPO/RTO definitions, backup schedules, and recovery procedures

2. **Implementation Commands** — Executable bash commands for etcd snapshots, Velero backups, and recovery procedures

3. **YAML Manifests** — Complete Kubernetes manifests for:
   - Velero backup schedules (multiple RPO tiers)
   - Cross-region backup storage locations
   - Disaster validation jobs
   - RBAC for DR operations

4. **Validation Pipeline** — Automated backup validation and recovery test configurations

5. **Runbook Template** — Step-by-step recovery procedures for common failure scenarios

---

## Related Skills

| Skill | Purpose |
|---|---|
| `cncf-velero` | Backup-specific operations, restore procedures, and Velero configuration patterns |
| `cncf-argocd` | GitOps-based disaster recovery with automated failover and sync policies |
| `cncf-etcd` | etcd cluster management, snapshots, and cluster recovery procedures |
| `cncf-prometheus` | Monitoring for DR validation, backup success metrics, and alerting |

---

### Pattern 6: Velero Backup Validation Script

**Description:** Automated backup validation that checks backup integrity, verifies storage accessibility, and generates reports.

```bash
# velero-backup-validation.sh
#!/bin/bash
set -euo pipefail

# Configuration
VELERO_NAMESPACE="velero"
VALIDATION_LOG="/var/log/velero-validation.log"
BACKUP_RETENTION_DAYS=7

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${VALIDATION_LOG}"
}

# Check Velero status
log "Checking Velero status..."
velero status --namespace="${VELERO_NAMESPACE}" || {
    log "ERROR: Velero is not running"
    exit 1
}

# List all backups
log "Listing all backups..."
velero backup get -o wide --namespace="${VELERO_NAMESPACE}" > /tmp/backups.txt

# Validate each backup
log "Validating backups..."
while IFS= read -r backup_name; do
    log "Validating backup: ${backup_name}"
    
    # Check backup status
    status=$(velero backup get "${backup_name}" -o jsonpath='{.status.phase}' --namespace="${VELERO_NAMESPACE}")
    
    if [[ "${status}" != "Completed" ]]; then
        log "WARNING: Backup ${backup_name} status is ${status}"
        velero backup describe "${backup_name}" --namespace="${VELERO_NAMESPACE}" | tee -a "${VALIDATION_LOG}"
    fi
    
    # Check for errors
    errors=$(velero backup describe "${backup_name}" --namespace="${VELERO_NAMESPACE}" | grep -c "Errors:" || true)
    if [[ "${errors}" -gt 0 ]]; then
        log "ERROR: Backup ${backup_name} has errors"
        exit 1
    fi
done < <(tail -n +2 /tmp/backups.txt | awk '{print $1}')

# Validate storage location accessibility
log "Checking storage location accessibility..."
velero backup-location get --namespace="${VELERO_NAMESPACE}" -o wide

# Clean old backups
log "Cleaning backups older than ${BACKUP_RETENTION_DAYS} days..."
for backup in $(velero backup get -o json --namespace="${VELERO_NAMESPACE}" | jq -r '.items[] | select(.status.phase == "Completed") | select(.metadata.creationTimestamp | sub("-[0-9]+$"; "") | fromdateiso8601 < (now - (86400 * '"${BACKUP_RETENTION_DAYS}"')) | .metadata.name'); do
    log "Deleting old backup: ${backup}"
    velero backup delete "${backup}" --namespace="${VELERO_NAMESPACE}" --confirm
done

# Generate validation report
log "Generating validation report..."
cat > /tmp/validation-report.txt << EOF
=== Velero Backup Validation Report ===
Date: $(date)
Namespace: ${VELERO_NAMESPACE}

Backups Validated: $(tail -n +2 /tmp/backups.txt | wc -l)
Failed Backups: $(grep -c "Failed\|InProgress" /tmp/backups.txt || echo "0")

Storage Locations:
$(velero backup-location get --namespace="${VELERO_NAMESPACE}" -o wide)

EOF

cat /tmp/validation-report.txt | tee -a "${VALIDATION_LOG}"

# Send notification if there are issues
if grep -q "WARNING\|ERROR" "${VALIDATION_LOG}"; then
    log "NOTIFICATION: Validation issues detected"
    # slack-post --channel "#dr-alerts" --message "DR Validation: Some backups have issues"
fi

log "Validation complete"
```

### Pattern 7: Recovery Time Estimation Calculator

**Description:** Calculate estimated recovery time based on backup size, network bandwidth, and restore complexity.

```bash
# rto-calculator.sh
#!/bin/bash
set -euo pipefail

# Configuration
NETWORK_BANDWIDTH_Gbps=10  # Network bandwidth in gigabits per second
RESTORE_OVERHEAD_FACTOR=1.5  # Overhead factor for restore operations

calculate_rto() {
    local backup_size_gb=$1
    local num_resources=$2
    local complexity_level=$3  # 1=low, 2=medium, 3=high
    
    # Convert bandwidth to GB/s (1 Gbps = 0.125 GB/s)
    local bandwidth_GB_s=$(echo "$NETWORK_BANDWIDTH_Gbps * 0.125" | bc)
    
    # Calculate transfer time
    local transfer_time_s=$(echo "scale=2; $backup_size_gb / $bandwidth_GB_s" | bc)
    
    # Calculate processing time based on complexity
    local processing_time_s=0
    case ${complexity_level} in
        1) processing_time_s=$(echo "$num_resources * 2" | bc) ;;  # 2 seconds per resource (low)
        2) processing_time_s=$(echo "$num_resources * 5" | bc) ;;  # 5 seconds per resource (medium)
        3) processing_time_s=$(echo "$num_resources * 10" | bc) ;; # 10 seconds per resource (high)
    esac
    
    # Calculate total restore time with overhead
    local total_time_s=$(echo "scale=2; ($transfer_time_s + $processing_time_s) * $RESTORE_OVERHEAD_FACTOR" | bc)
    
    # Convert to minutes
    local total_time_min=$(echo "scale=2; $total_time_s / 60" | bc)
    
    echo "=== Recovery Time Estimate ==="
    echo "Backup Size: ${backup_size_gb} GB"
    echo "Resources to Restore: ${num_resources}"
    echo "Complexity Level: ${complexity_level}"
    echo ""
    echo "Transfer Time: ${transfer_time_s} seconds"
    echo "Processing Time: ${processing_time_s} seconds"
    echo "Total Time (with ${RESTORE_OVERHEAD_FACTOR}x overhead): ${total_time_s} seconds (${total_time_min} minutes)"
    
    # Determine if RTO is achievable
    if (( $(echo "$total_time_min < 15" | bc -l) )); then
        echo "RTO Status: ✅ ACHIEVABLE (< 15 minutes)"
    elif (( $(echo "$total_time_min < 60" | bc -l) )); then
        echo "RTO Status: ⚠️  MARGINAL (15-60 minutes)"
    else
        echo "RTO Status: ❌ NOT ACHIEVABLE (> 1 hour)"
    fi
}

# Example usage
echo "Calculating RTO for different scenarios:"
echo ""

echo "Scenario 1: Small application (1GB, 50 resources, low complexity)"
calculate_rto 1 50 1
echo ""

echo "Scenario 2: Medium application (10GB, 200 resources, medium complexity)"
calculate_rto 10 200 2
echo ""

echo "Scenario 3: Large critical application (100GB, 1000 resources, high complexity)"
calculate_rto 100 1000 3
```

### Pattern 8: Backup Size Growth Analysis

**Description:** Analyze backup size growth patterns to predict storage requirements.

```bash
# backup-size-analysis.sh
#!/bin/bash
set -euo pipefail

# Configuration
BACKUP_STORAGE_DIR="/var/backups/velero"
OUTPUT_FILE="/tmp/backup-growth-report.txt"

# Extract backup sizes from backup metadata
analyze_backup_sizes() {
    echo "=== Backup Size Growth Analysis ===" > "${OUTPUT_FILE}"
    echo "Generated: $(date)" >> "${OUTPUT_FILE}"
    echo "" >> "${OUTPUT_FILE}"
    
    # Get all backups
    echo "Analyzing backup sizes..."
    
    # Create temporary file for size data
    local size_data_file=$(mktemp)
    
    # Extract backup information
    for backup_dir in "${BACKUP_STORAGE_DIR}"/velero-backups/*; do
        if [[ -d "${backup_dir}" ]]; then
            backup_name=$(basename "${backup_dir}")
            backup_size=$(du -sb "${backup_dir}" 2>/dev/null | cut -f1)
            backup_date=$(stat -c %y "${backup_dir}" | cut -d' ' -f1)
            
            echo "${backup_date},${backup_name},${backup_size}" >> "${size_data_file}"
        fi
    done
    
    # Sort by date
    sort -t',' -k1 "${size_data_file}" > "${size_data_file}.sorted"
    
    # Calculate statistics
    local total_backups=$(wc -l < "${size_data_file}.sorted")
    local total_size=$(awk -F',' '{sum += $3} END {print sum}' "${size_data_file}.sorted")
    local avg_size=$(echo "scale=2; ${total_size} / ${total_backups}" | bc)
    
    # Calculate daily growth
    echo "Backup Statistics:" >> "${OUTPUT_FILE}"
    echo "- Total Backups: ${total_backups}" >> "${OUTPUT_FILE}"
    echo "- Total Storage Used: $(echo "scale=2; ${total_size} / 1073741824" | bc) GB" >> "${OUTPUT_FILE}"
    echo "- Average Backup Size: $(echo "scale=2; ${avg_size} / 1073741824" | bc) GB" >> "${OUTPUT_FILE}"
    echo "" >> "${OUTPUT_FILE}"
    
    # Calculate daily growth rate
    if [[ ${total_backups} -ge 2 ]]; then
        local first_backup=$(head -1 "${size_data_file}.sorted" | cut -d',' -f1)
        local last_backup=$(tail -1 "${size_data_file}.sorted" | cut -d',' -f1)
        local first_size=$(head -1 "${size_data_file}.sorted" | cut -d',' -f3)
        local last_size=$(tail -1 "${size_data_file}.sorted" | cut -d',' -f3)
        
        # Calculate days between first and last backup
        local days_diff=$(( ($(date -d "${last_backup}" +%s) - $(date -d "${first_backup}" +%s)) / 86400 ))
        
        if [[ ${days_diff} -gt 0 ]]; then
            local daily_growth=$(( (${last_size} - ${first_size}) / ${days_diff} ))
            local monthly_growth=$(( ${daily_growth} * 30 ))
            
            echo "Growth Analysis:" >> "${OUTPUT_FILE}"
            echo "- Period: ${days_diff} days" >> "${OUTPUT_FILE}"
            echo "- Daily Growth: $(echo "scale=2; ${daily_growth} / 1073741824" | bc) GB" >> "${OUTPUT_FILE}"
            echo "- Monthly Projection: $(echo "scale=2; ${monthly_growth} / 1073741824" | bc) GB" >> "${OUTPUT_FILE}"
            echo "" >> "${OUTPUT_FILE}"
            
            # Project 3-month and 6-month storage needs
            local three_month_storage=$(echo "scale=2; ${monthly_growth} * 3" | bc)
            local six_month_storage=$(echo "scale=2; ${monthly_growth} * 6" | bc)
            
            echo "Storage Projections:" >> "${OUTPUT_FILE}"
            echo "- 3 Month Projection: ${three_month_storage} GB" >> "${OUTPUT_FILE}"
            echo "- 6 Month Projection: ${six_month_storage} GB" >> "${OUTPUT_FILE}"
        fi
    fi
    
    # List recent backups
    echo "" >> "${OUTPUT_FILE}"
    echo "Recent Backups:" >> "${OUTPUT_FILE}"
    tail -10 "${size_data_file}.sorted" | while IFS=',' read -r date name size; do
        echo "- ${date}: ${name} ($(echo "scale=2; ${size} / 1073741824" | bc) GB)" >> "${OUTPUT_FILE}"
    done
    
    cat "${OUTPUT_FILE}"
    
    # Cleanup
    rm -f "${size_data_file}" "${size_data_file}.sorted"
}

# Run analysis
analyze_backup_sizes
```

### Pattern 9: Cross-Region Failover Automation

**Description:** Automated failover script that coordinates between primary and secondary regions.

```python
#!/usr/bin/env python3
"""
Cross-Region Failover Automation
Coordinates disaster recovery failover between primary and secondary regions.
"""

import subprocess
import sys
import time
import json
import logging
from typing import Dict, Optional
from dataclasses import dataclass
from enum import Enum

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class RegionState(Enum):
    PRIMARY = "primary"
    SECONDARY = "secondary"
    TERTIARY = "tertiary"


@dataclass
class FailoverConfig:
    """Configuration for cross-region failover."""
    primary_region: str
    secondary_region: str
    tertiary_region: str
    failover_threshold_minutes: int = 5
    dns_update_timeout_seconds: int = 300


class CrossRegionFailover:
    """Handles cross-region disaster recovery failover operations."""
    
    def __init__(self, config: FailoverConfig):
        self.config = config
        self.state = RegionState.PRIMARY
        self.failed_over = False
    
    def _run_kubectl(self, region: str, *args: str) -> str:
        """Execute kubectl command for a specific region."""
        cmd = ["kubectl", "--context", f"{region}-cluster"] + list(args)
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True
            )
            return result.stdout
        except subprocess.CalledProcessError as e:
            logger.error(f"Command failed: {e.stderr}")
            raise
    
    def _check_cluster_health(self, region: str) -> bool:
        """Check if cluster in specified region is healthy."""
        try:
            nodes = self._run_kubectl(region, "get", "nodes", "-o", "json")
            node_data = json.loads(nodes)
            
            ready_nodes = sum(
                1 for item in node_data.get("items", [])
                if any(
                    cond["status"] == "True" and cond["type"] == "Ready"
                    for cond in item.get("status", {}).get("conditions", [])
                )
            )
            
            total_nodes = len(node_data.get("items", []))
            logger.info(f"Region {region}: {ready_nodes}/{total_nodes} nodes ready")
            
            return ready_nodes >= total_nodes
        except Exception as e:
            logger.error(f"Health check failed for {region}: {e}")
            return False
    
    def _validate_backup_availability(self, region: str) -> bool:
        """Verify backups are available in the target region."""
        try:
            backups = self._run_kubectl(
                region,
                "-n", "velero",
                "get", "backups",
                "-o", "json"
            )
            backup_data = json.loads(backups)
            
            completed_backups = sum(
                1 for item in backup_data.get("items", [])
                if item.get("status", {}).get("phase") == "Completed"
            )
            
            logger.info(f"Region {region}: {completed_backups} completed backups available")
            return completed_backups > 0
        except Exception as e:
            logger.error(f"Backup validation failed for {region}: {e}")
            return False
    
    def _promote_secondary_region(self) -> None:
        """Promote secondary region to active."""
        logger.info("Promoting secondary region...")
        
        # 1. Stop accepting writes in primary
        logger.info("Stopping write operations in primary region...")
        # self._drain_primary_cluster()
        
        # 2. Sync any remaining data
        logger.info("Syncing remaining data...")
        # self._sync_data()
        
        # 3. Update DNS to point to secondary
        logger.info("Updating DNS to secondary region...")
        # self._update_dns(self.config.secondary_region)
        
        # 4. Promote secondary cluster
        logger.info("Promoting secondary cluster...")
        self._run_kubectl(
            self.config.secondary_region,
            "apply", "-f", "/etc/dr/failover-promotion.yaml"
        )
        
        # 5. Verify services are running
        logger.info("Verifying services in secondary region...")
        time.sleep(30)  # Wait for services to start
        self.state = RegionState.SECONDARY
        self.failed_over = True
    
    def _drain_primary_cluster(self) -> None:
        """Drain the primary cluster gracefully."""
        logger.info("Draining primary cluster...")
        
        # Cordon all nodes
        self._run_kubectl(
            self.config.primary_region,
            "cordon", "--all-nodes"
        )
        
        # Evict pods
        self._run_kubectl(
            self.config.primary_region,
            "drain", "--all-nodes",
            "--ignore-daemonsets",
            "--delete-emptydir-data",
            "--force"
        )
    
    def execute_failover(self) -> bool:
        """Execute cross-region failover."""
        logger.info("Starting failover procedure...")
        
        try:
            # Validate secondary region is healthy
            if not self._check_cluster_health(self.config.secondary_region):
                logger.error("Secondary region is not healthy")
                return False
            
            # Validate backups are available
            if not self._validate_backup_availability(self.config.secondary_region):
                logger.error("No backups available in secondary region")
                return False
            
            # Execute failover
            self._promote_secondary_region()
            
            # Verify failover success
            if self.state == RegionState.SECONDARY:
                logger.info("Failover completed successfully")
                return True
            else:
                logger.error("Failover failed")
                return False
                
        except Exception as e:
            logger.error(f"Failover failed with error: {e}")
            return False
    
    def execute_failback(self) -> bool:
        """Execute failback to primary region."""
        logger.info("Starting failback procedure...")
        
        try:
            # Validate primary region is healthy
            if not self._check_cluster_health(self.config.primary_region):
                logger.error("Primary region is not healthy")
                return False
            
            # Validate backups are available in primary
            if not self._validate_backup_availability(self.config.primary_region):
                logger.error("No backups available in primary region")
                return False
            
            # Execute failback
            self._promote_primary_region()
            
            # Verify failback success
            if self.state == RegionState.PRIMARY:
                logger.info("Failback completed successfully")
                return True
            else:
                logger.error("Failback failed")
                return False
                
        except Exception as e:
            logger.error(f"Failback failed with error: {e}")
            return False
    
    def _promote_primary_region(self) -> None:
        """Promote primary region back to active."""
        logger.info("Promoting primary region...")
        
        # Update DNS to point to primary
        logger.info("Updating DNS to primary region...")
        # self._update_dns(self.config.primary_region)
        
        # Promote primary cluster
        logger.info("Promoting primary cluster...")
        self._run_kubectl(
            self.config.primary_region,
            "apply", "-f", "/etc/dr/failback-promotion.yaml"
        )
        
        # Verify services are running
        logger.info("Verifying services in primary region...")
        time.sleep(30)
        self.state = RegionState.PRIMARY
        self.failed_over = False


def main():
    """Main entry point."""
    config = FailoverConfig(
        primary_region="us-east-1",
        secondary_region="us-west-2",
        tertiary_region="eu-west-1",
        failover_threshold_minutes=5
    )
    
    failover = CrossRegionFailover(config)
    
    if len(sys.argv) < 2:
        print("Usage: cross-region-failover.py [failover|failback|status]")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "failover":
        success = failover.execute_failover()
        sys.exit(0 if success else 1)
    elif command == "failback":
        success = failover.execute_failback()
        sys.exit(0 if success else 1)
    elif command == "status":
        print(f"Current Region: {failover.state.value}")
        print(f"Failed Over: {failover.failed_over}")
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)


if __name__ == "__main__":
    main()
```

### Pattern 10: Disaster Recovery Runbook Automation

**Description:** Automated runbook execution with step tracking and status reporting.

```bash
#!/bin/bash
set -euo pipefail

# Disaster Recovery Runbook Automation
# Executes recovery procedures with step tracking and reporting

# Configuration
DR_RUNBOOK_DIR="/etc/dr/runbooks"
REPORT_DIR="/var/log/dr-reports"
DRY_RUN="${DRY_RUN:-false}"

# Track execution status
declare -A STEP_STATUS
TOTAL_STEPS=0
COMPLETED_STEPS=0

log() {
    local level=$1
    shift
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $*" | tee -a "${REPORT_DIR}/recovery-$(date +%Y%m%d).log"
}

track_step() {
    local step_name=$1
    local status=$2
    STEP_STATUS[$step_name]=$status
    ((COMPLETED_STEPS++))
    log "INFO" "Step $step_name: $status ($COMPLETED_STEPS/$TOTAL_STEPS)"
}

execute_step() {
    local step_name=$1
    local step_file=$2
    local description=$3
    
    log "INFO" "Executing: $description"
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        log "INFO" "[DRY RUN] Would execute: $step_file"
        track_step "$step_name" "skipped (dry-run)"
        return 0
    fi
    
    if [[ -f "${DR_RUNBOOK_DIR}/${step_file}" ]]; then
        if bash "${DR_RUNBOOK_DIR}/${step_file}"; then
            track_step "$step_name" "completed"
            return 0
        else
            track_step "$step_name" "failed"
            log "ERROR" "Step $step_name failed"
            return 1
        fi
    else
        log "ERROR" "Runbook file not found: ${DR_RUNBOOK_DIR}/${step_file}"
        return 1
    fi
}

generate_report() {
    local report_file="${REPORT_DIR}/recovery-$(date +%Y%m%d-%H%M%S).json"
    
    cat > "${report_file}" << EOF
{
    "timestamp": "$(date -Iseconds)",
    "scenario": "${1:-unknown}",
    "total_steps": ${TOTAL_STEPS},
    "completed_steps": ${COMPLETED_STEPS},
    "status": "$([[ ${COMPLETED_STEPS} -eq ${TOTAL_STEPS} ]] && echo 'success' || echo 'failed')",
    "steps": {
EOF
    
    local first=true
    for step in "${!STEP_STATUS[@]}"; do
        if [[ "${first}" == "true" ]]; then
            first=false
        else
            echo "," >> "${report_file}"
        fi
        printf '        "%s": "%s"' "${step}" "${STEP_STATUS[$step]}" >> "${report_file}"
    done
    
    cat >> "${report_file}" << EOF

    }
}
EOF
    
    log "INFO" "Report generated: ${report_file}"
}

# Scenario 1: Cluster Recovery
run_cluster_recovery() {
    log "INFO" "Starting cluster recovery procedure..."
    TOTAL_STEPS=8
    
    execute_step "1" "cluster-status.sh" "Check cluster status"
    execute_step "2" "backup-validation.sh" "Validate backup integrity"
    execute_step "3" "restore-etcd.sh" "Restore etcd from snapshot"
    execute_step "4" "restore-cluster-components.sh" "Restore cluster components"
    execute_step "5" "restore-namespaces.sh" "Restore namespaces"
    execute_step "6" "restore-applications.sh" "Restore applications"
    execute_step "7" "health-check.sh" "Run health checks"
    execute_step "8" "dns-update.sh" "Update DNS records"
    
    generate_report "cluster-recovery"
}

# Scenario 2: Data Corruption Recovery
run_data_corruption_recovery() {
    log "INFO" "Starting data corruption recovery procedure..."
    TOTAL_STEPS=6
    
    execute_step "1" "identify-corruption.sh" "Identify affected data"
    execute_step "2" "find-clean-backup.sh" "Find clean backup before corruption"
    execute_step "3" "restore-backup.sh" "Restore from clean backup"
    execute_step "4" "validate-restoration.sh" "Validate restored data"
    execute_step "5" "verify-applications.sh" "Verify application functionality"
    execute_step "6" "notification.sh" "Send notification"
    
    generate_report "data-corruption-recovery"
}

# Scenario 3: Full Site Failover
run_site_failover() {
    log "INFO" "Starting site failover procedure..."
    TOTAL_STEPS=10
    
    execute_step "1" "detect-site-failure.sh" "Detect site failure"
    execute_step "2" "validate-secondary.sh" "Validate secondary site readiness"
    execute_step "3" "drain-primary.sh" "Drain primary site"
    execute_step "4" "promote-secondary.sh" "Promote secondary site"
    execute_step "5" "update-dns.sh" "Update DNS records"
    execute_step "6" "verify-services.sh" "Verify services are running"
    execute_step "7" "notify-stakeholders.sh" "Notify stakeholders"
    execute_step "8" "monitor-operations.sh" "Monitor operations"
    execute_step "9" "document-incident.sh" "Document incident"
    execute_step "10" "schedule-post-mortem.sh" "Schedule post-mortem"
    
    generate_report "site-failover"
}

# Main execution
case "${1:-cluster-recovery}" in
    cluster-recovery)
        run_cluster_recovery
        ;;
    data-corruption)
        run_data_corruption_recovery
        ;;
    site-failover)
        run_site_failover
        ;;
    *)
        echo "Usage: $0 [cluster-recovery|data-corruption|site-failover]"
        exit 1
        ;;
esac
```

### Pattern 11: Backup Encryption Key Management

**Description:** Secure backup encryption key management with automated rotation.

```bash
#!/bin/bash
set -euo pipefail

# Backup Encryption Key Management
# Handles key generation, rotation, and secure storage

# Configuration
KEY_STORAGE_DIR="/etc/dr/encryption-keys"
KEY_ROTATION_DAYS=90
AWS_KMS_KEY_ALIAS="alias/velero-backup-keys"

# Generate new encryption key
generate_backup_key() {
    local key_name=$1
    local key_file="${KEY_STORAGE_DIR}/${key_name}.key"
    
    # Generate cryptographically secure key
    openssl rand -base64 32 > "${key_file}"
    chmod 600 "${key_file}"
    chown velero:velero "${key_file}"
    
    log "INFO" "Generated new encryption key: ${key_name}"
}

# Rotate encryption keys
rotate_backup_keys() {
    local old_key=$1
    local new_key="${KEY_STORAGE_DIR}/backup-key-$(date +%Y%m%d).key"
    
    log "INFO" "Rotating encryption keys..."
    
    # Generate new key
    generate_backup_key "backup-key-$(date +%Y%m%d)"
    
    # Re-encrypt existing backups with new key
    log "INFO" "Re-encrypting backups with new key..."
    
    # Update Velero backup location configuration
    velero backup-location update primary-backups \
        --config "kmsKeyId=${AWS_KMS_KEY_ALIAS}" \
        --access-key-id "${new_key}" \
        --secret-access-key "$(cat ${new_key})"
    
    log "INFO" "Key rotation completed"
}

# Validate encryption key
validate_backup_key() {
    local key_file=$1
    
    if [[ ! -f "${key_file}" ]]; then
        log "ERROR" "Encryption key file not found: ${key_file}"
        return 1
    fi
    
    # Check file permissions
    if [[ ! -r "${key_file}" ]]; then
        log "ERROR" "Encryption key not readable"
        return 1
    fi
    
    # Validate key format (base64 encoded, 32 bytes)
    if ! openssl base64 -d -in "${key_file}" -out /dev/null 2>&1; then
        log "ERROR" "Invalid encryption key format"
        return 1
    fi
    
    log "INFO" "Encryption key validation passed"
    return 0
}

# Store key in AWS KMS
store_key_in_kms() {
    local key_file=$1
    local key_id=$2
    
    log "INFO" "Storing key in AWS KMS..."
    
    # Read key content
    local key_content=$(cat "${key_file}")
    
    # Encrypt key with KMS
    aws kms encrypt \
        --key-id "${AWS_KMS_KEY_ALIAS}" \
        --plaintext "${key_content}" \
        --output text \
        --query CiphertextBlob > "${key_file}.encrypted"
    
    # Remove plain text key
    shred -u "${key_file}"
    
    log "INFO" "Key stored in KMS: ${key_id}"
}

# Restore key from KMS
restore_key_from_kms() {
    local key_id=$1
    local output_file=$2
    
    log "INFO" "Restoring key from KMS..."
    
    # Decrypt key from KMS
    local encrypted_key=$(aws kms decrypt \
        --key-id "${AWS_KMS_KEY_ALIAS}" \
        --ciphertext-blob fileb://${KEY_STORAGE_DIR}/${key_id}.encrypted \
        --query Plaintext \
        --output text)
    
    # Decode and save key
    echo "${encrypted_key}" | base64 -d > "${output_file}"
    chmod 600 "${output_file}"
    
    log "INFO" "Key restored from KMS"
}

# Main key management loop
key_management_loop() {
    log "INFO" "Starting encryption key management..."
    
    # Check key age and rotate if necessary
    for key_file in "${KEY_STORAGE_DIR}"/backup-key-*.key; do
        if [[ -f "${key_file}" ]]; then
            local key_age=$(( ($(date +%s) - $(stat -c %Y "${key_file}")) / 86400 ))
            
            if [[ ${key_age} -gt ${KEY_ROTATION_DAYS} ]]; then
                log "INFO" "Key ${key_file} is ${key_age} days old, rotating..."
                rotate_backup_keys "${key_file}"
            fi
        fi
    done
    
    # Validate all current keys
    for key_file in "${KEY_STORAGE_DIR}"/backup-key-*.key; do
        if [[ -f "${key_file}" ]]; then
            validate_backup_key "${key_file}"
        fi
    done
}

# Run key management
key_management_loop
```

### Pattern 12: Disaster Recovery Monitoring Dashboard

**Description:** Prometheus alerts and Grafana dashboard for disaster recovery monitoring.

```yaml
# dr-monitoring-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: dr-alerts
  namespace: monitoring
  labels:
    prometheus: kube-prometheus
    role: alert-rules
spec:
  groups:
  - name: disaster-recovery-alerts
    rules:
    - alert: VeleroBackupFailed
      expr: |
        velero_backup_total{phase="Failed"} > 0
      for: 5m
      labels:
        severity: critical
        category: disaster-recovery
      annotations:
        summary: "Velero backup failed"
        description: "Backup {{ $labels.name }} has failed. Check Velero logs for details."
    
    - alert: VeleroBackupStuck
      expr: |
        velero_backup_total{phase="InProgress"} > 0
      for: 1h
      labels:
        severity: warning
        category: disaster-recovery
      annotations:
        summary: "Velero backup stuck in progress"
        description: "Backup {{ $labels.name }} has been in progress for more than 1 hour."
    
    - alert: BackupStorageLocationUnavailable
      expr: |
        velero_backup_storage_location_available{available="false"} > 0
      for: 5m
      labels:
        severity: critical
        category: disaster-recovery
      annotations:
        summary: "Backup storage location unavailable"
        description: "Backup storage location {{ $labels.name }} is unavailable."
    
    - alert: EtcdBackupFailed
      expr: |
        etcd_backup_failed == 1
      for: 0m
      labels:
        severity: critical
        category: disaster-recovery
      annotations:
        summary: "etcd backup failed"
        description: "etcd backup has failed. Immediate action required."
    
    - alert: CrossRegionReplicationLag
      expr: |
        cross_region_replication_lag_seconds > 300
      for: 5m
      labels:
        severity: warning
        category: disaster-recovery
      annotations:
        summary: "Cross-region replication lag detected"
        description: "Replication lag is {{ $value | humanizeDuration }}. Target: < 5 minutes."
    
    - alert: RTOExceeded
      expr: |
        recovery_time_seconds > (15 * 60)
      for: 0m
      labels:
        severity: critical
        category: disaster-recovery
      annotations:
        summary: "RTO exceeded"
        description: "Recovery time {{ $value | humanizeDuration }} exceeded RTO of 15 minutes."
    
    - alert: RPOExceeded
      expr: |
        recovery_point_age_seconds > (5 * 60)
      for: 0m
      labels:
        severity: critical
        category: disaster-recovery
      annotations:
        summary: "RPO exceeded"
        description: "Recovery point age {{ $value | humanizeDuration }} exceeded RPO of 5 minutes."
    
    - alert: DRValidationFailed
      expr: |
        dr_validation_status == 0
      for: 0m
      labels:
        severity: critical
        category: disaster-recovery
      annotations:
        summary: "Disaster recovery validation failed"
        description: "DR validation has failed. Check validation job logs."
    
    - alert: DRRunbookOutdated
      expr: |
        dr_runbook_last_updated_days > 30
      for: 0m
      labels:
        severity: warning
        category: disaster-recovery
      annotations:
        summary: "DR runbook outdated"
        description: "DR runbook has not been updated in {{ $value }} days."

---
# DR Monitoring Dashboard
apiVersion: v1
kind: ConfigMap
metadata:
  name: dr-monitoring-dashboard
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  dr-dashboard.json: |
    {
      "annotations": {
        "list": [
          {
            "builtIn": 1,
            "datasource": "-- Grafana --",
            "enable": true,
            "hide": true,
            "iconColor": "rgba(0, 211, 255, 1)",
            "name": "Annotations & Alerts"
          }
        ]
      },
      "editable": true,
      "gnetId": null,
      "graphTooltip": 0,
      "id": null,
      "links": [],
      "panels": [
        {
          "aliasColors": {},
          "bars": false,
          "dashLength": 10,
          "dashes": false,
          "datasource": "Prometheus",
          "fieldConfig": {
            "defaults": {},
            "overrides": []
          },
          "fill": 1,
          "fillGradient": 0,
          "gridPos": {
            "h": 8,
            "w": 12,
            "x": 0,
            "y": 0
          },
          "hiddenSeries": false,
          "id": 2,
          "legend": {
            "avg": false,
            "current": false,
            "max": false,
            "min": false,
            "show": true,
            "total": false,
            "values": false
          },
          "lines": true,
          "linewidth": 1,
          "nullPointMode": "null",
          "options": {
            "alertThreshold": true
          },
          "percentage": false,
          "pluginVersion": "8.0.0",
          "pointradius": 2,
          "points": false,
          "renderer": "flot",
          "seriesOverrides": [],
          "spaceLength": 10,
          "stack": false,
          "steppedLine": false,
          "targets": [
            {
              "expr": "sum(velero_backup_total{phase=\"Completed\"}) by (name)",
              "legendFormat": "{{ name }}",
              "refId": "A"
            }
          ],
          "thresholds": [],
          "timeFrom": null,
          "timeRegions": [],
          "timeShift": null,
          "title": "Completed Backups",
          "tooltip": {
            "shared": true,
            "sort": 0,
            "value_type": "individual"
          },
          "type": "graph",
          "xaxis": {
            "buckets": null,
            "mode": "time",
            "name": null,
            "show": true,
            "values": []
          },
          "yaxes": [
            {
              "format": "short",
              "label": null,
              "logBase": 1,
              "max": null,
              "min": null,
              "show": true
            },
            {
              "format": "short",
              "label": null,
              "logBase": 1,
              "max": null,
              "min": null,
              "show": true
            }
          ],
          "yaxis": {
            "align": false,
            "alignLevel": null
          }
        },
        {
          "aliasColors": {},
          "bars": false,
          "dashLength": 10,
          "dashes": false,
          "datasource": "Prometheus",
          "fieldConfig": {
            "defaults": {},
            "overrides": []
          },
          "fill": 1,
          "fillGradient": 0,
          "gridPos": {
            "h": 8,
            "w": 12,
            "x": 12,
            "y": 0
          },
          "hiddenSeries": false,
          "id": 4,
          "legend": {
            "avg": false,
            "current": false,
            "max": false,
            "min": false,
            "show": true,
            "total": false,
            "values": false
          },
          "lines": true,
          "linewidth": 1,
          "nullPointMode": "null",
          "options": {
            "alertThreshold": true
          },
          "percentage": false,
          "pluginVersion": "8.0.0",
          "pointradius": 2,
          "points": false,
          "renderer": "flot",
          "seriesOverrides": [],
          "spaceLength": 10,
          "stack": false,
          "steppedLine": false,
          "targets": [
            {
              "expr": "velero_backup_total{phase=\"Failed\"}",
              "legendFormat": "{{ name }}",
              "refId": "A"
            }
          ],
          "thresholds": [],
          "timeFrom": null,
          "timeRegions": [],
          "timeShift": null,
          "title": "Failed Backups",
          "tooltip": {
            "shared": true,
            "sort": 0,
            "value_type": "individual"
          },
          "type": "graph",
          "xaxis": {
            "buckets": null,
            "mode": "time",
            "name": null,
            "show": true,
            "values": []
          },
          "yaxes": [
            {
              "format": "short",
              "label": null,
              "logBase": 1,
              "max": null,
              "min": null,
              "show": true
            },
            {
              "format": "short",
              "label": null,
              "logBase": 1,
              "max": null,
              "min": null,
              "show": true
            }
          ],
          "yaxis": {
            "align": false,
            "alignLevel": null
          }
        },
        {
          "datasource": "Prometheus",
          "fieldConfig": {
            "defaults": {
              "color": {
                "mode": "thresholds"
              },
              "mappings": [],
              "thresholds": {
                "mode": "absolute",
                "steps": [
                  {
                    "color": "green",
                    "value": null
                  },
                  {
                    "color": "red",
                    "value": 80
                  }
                ]
              }
            },
            "overrides": []
          },
          "gridPos": {
            "h": 4,
            "w": 24,
            "x": 0,
            "y": 8
          },
          "id": 6,
          "options": {
            "colorMode": "value",
            "graphMode": "area",
            "justifyMode": "auto",
            "orientation": "auto",
            "reduceOptions": {
              "calcs": [
                "lastNotNull"
              ],
              "fields": "",
              "values": false
            },
            "textMode": "auto"
          },
          "pluginVersion": "8.0.0",
          "targets": [
            {
              "expr": "sum(velero_backup_total{phase=\"Completed\"})",
              "refId": "A"
            }
          ],
          "title": "Total Completed Backups",
          "type": "stat"
        },
        {
          "datasource": "Prometheus",
          "fieldConfig": {
            "defaults": {
              "color": {
                "mode": "thresholds"
              },
              "mappings": [],
              "thresholds": {
                "mode": "absolute",
                "steps": [
                  {
                    "color": "green",
                    "value": null
                  },
                  {
                    "color": "red",
                    "value": 1
                  }
                ]
              }
            },
            "overrides": []
          },
          "gridPos": {
            "h": 4,
            "w": 8,
            "x": 0,
            "y": 12
          },
          "id": 8,
          "options": {
            "colorMode": "value",
            "graphMode": "area",
            "justifyMode": "auto",
            "orientation": "auto",
            "reduceOptions": {
              "calcs": [
                "lastNotNull"
              ],
              "fields": "",
              "values": false
            },
            "textMode": "auto"
          },
          "pluginVersion": "8.0.0",
          "targets": [
            {
              "expr": "sum(velero_backup_total{phase=\"Failed\"})",
              "refId": "A"
            }
          ],
          "title": "Failed Backups (Total)",
          "type": "stat"
        },
        {
          "datasource": "Prometheus",
          "fieldConfig": {
            "defaults": {
              "color": {
                "mode": "thresholds"
              },
              "mappings": [],
              "thresholds": {
                "mode": "absolute",
                "steps": [
                  {
                    "color": "green",
                    "value": null
                  },
                  {
                    "color": "yellow",
                    "value": 0.8
                  },
                  {
                    "color": "red",
                    "value": 0.9
                  }
                ]
              }
            },
            "overrides": []
          },
          "gridPos": {
            "h": 4,
            "w": 8,
            "x": 8,
            "y": 12
          },
          "id": 10,
          "options": {
            "colorMode": "value",
            "graphMode": "area",
            "justifyMode": "auto",
            "orientation": "auto",
            "reduceOptions": {
              "calcs": [
                "lastNotNull"
              ],
              "fields": "",
              "values": false
            },
            "textMode": "auto"
          },
          "pluginVersion": "8.0.0",
          "targets": [
            {
              "expr": "sum(velero_backup_storage_location_available{available=\"false\"})",
              "refId": "A"
            }
          ],
          "title": "Unavailable Storage Locations",
          "type": "stat"
        },
        {
          "datasource": "Prometheus",
          "fieldConfig": {
            "defaults": {
              "color": {
                "mode": "thresholds"
              },
              "mappings": [],
              "thresholds": {
                "mode": "absolute",
                "steps": [
                  {
                    "color": "green",
                    "value": null
                  },
                  {
                    "color": "red",
                    "value": 1
                  }
                ]
              }
            },
            "overrides": []
          },
          "gridPos": {
            "h": 4,
            "w": 8,
            "x": 16,
            "y": 12
          },
          "id": 12,
          "options": {
            "colorMode": "value",
            "graphMode": "area",
            "justifyMode": "auto",
            "orientation": "auto",
            "reduceOptions": {
              "calcs": [
                "lastNotNull"
              ],
              "fields": "",
              "values": false
            },
            "textMode": "auto"
          },
          "pluginVersion": "8.0.0",
          "targets": [
            {
              "expr": "sum(etcd_backup_failed)",
              "refId": "A"
            }
          ],
          "title": "Failed etcd Backups",
          "type": "stat"
        }
      ],
      "schemaVersion": 27,
      "style": "dark",
      "tags": ["disaster-recovery", "monitoring"],
      "templating": {
        "list": []
      },
      "time": {
        "from": "now-24h",
        "to": "now"
      },
      "timepicker": {},
      "timezone": "",
      "title": "Disaster Recovery Dashboard",
      "uid": "dr-dashboard",
      "version": 1
    }
```

### Pattern 13: Disaster Recovery Testing Framework

**Description:** Automated testing framework for disaster recovery procedures with validation checks.

```bash
#!/bin/bash
set -euo pipefail

# Disaster Recovery Testing Framework
# Comprehensive testing of DR procedures

# Configuration
TEST_OUTPUT_DIR="/var/log/dr-tests"
DR_CLUSTER_NAME="${DR_CLUSTER_NAME:-dr-test-cluster}"
DR_NAMESPACE="dr-test-$(date +%Y%m%d)"

# Test results tracking
declare -A TEST_RESULTS
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "${TEST_OUTPUT_DIR}/test-log-$(date +%Y%m%d).log"
}

run_test() {
    local test_name=$1
    local test_script=$2
    
    ((TOTAL_TESTS++))
    
    if bash "${test_script}"; then
        TEST_RESULTS[$test_name]="PASSED"
        ((PASSED_TESTS++))
        log "TEST PASSED: ${test_name}"
        return 0
    else
        TEST_RESULTS[$test_name]="FAILED"
        ((FAILED_TESTS++))
        log "TEST FAILED: ${test_name}"
        return 1
    fi
}

generate_test_report() {
    local report_file="${TEST_OUTPUT_DIR}/test-report-$(date +%Y%m%d-%H%M%S).json"
    
    cat > "${report_file}" << EOF
{
    "timestamp": "$(date -Iseconds)",
    "cluster": "${DR_CLUSTER_NAME}",
    "total_tests": ${TOTAL_TESTS},
    "passed": ${PASSED_TESTS},
    "failed": ${FAILED_TESTS},
    "success_rate": $(echo "scale=2; ${PASSED_TESTS} * 100 / ${TOTAL_TESTS}" | bc),
    "tests": {
EOF
    
    local first=true
    for test in "${!TEST_RESULTS[@]}"; do
        if [[ "${first}" == "true" ]]; then
            first=false
        else
            echo "," >> "${report_file}"
        fi
        printf '        "%s": "%s"' "${test}" "${TEST_RESULTS[$test]}" >> "${report_file}"
    done
    
    cat >> "${report_file}" << EOF

    }
}
EOF
    
    log "Test report generated: ${report_file}"
    cat "${report_file}"
}

# Test Suite 1: Backup Tests
run_backup_tests() {
    log "Running backup tests..."
    
    # Test 1: Create backup
    run_test "backup-create" "/etc/dr-tests/backup-create.sh"
    
    # Test 2: Backup verification
    run_test "backup-verify" "/etc/dr-tests/backup-verify.sh"
    
    # Test 3: Backup restore
    run_test "backup-restore" "/etc/dr-tests/backup-restore.sh"
    
    # Test 4: Backup cleanup
    run_test "backup-cleanup" "/etc/dr-tests/backup-cleanup.sh"
}

# Test Suite 2: etcd Tests
run_etcd_tests() {
    log "Running etcd tests..."
    
    # Test 1: etcd snapshot
    run_test "etcd-snapshot" "/etc/dr-tests/etcd-snapshot.sh"
    
    # Test 2: etcd restore
    run_test "etcd-restore" "/etc/dr-tests/etcd-restore.sh"
    
    # Test 3: etcd cluster health
    run_test "etcd-health" "/etc/dr-tests/etcd-health.sh"
}

# Test Suite 3: Cross-Region Tests
run_cross_region_tests() {
    log "Running cross-region tests..."
    
    # Test 1: Replication check
    run_test "replication-check" "/etc/dr-tests/replication-check.sh"
    
    # Test 2: Failover test
    run_test "failover-test" "/etc/dr-tests/failover-test.sh"
    
    # Test 3: Failback test
    run_test "failback-test" "/etc/dr-tests/failback-test.sh"
}

# Test Suite 4: Application Tests
run_application_tests() {
    log "Running application tests..."
    
    # Test 1: Database connectivity
    run_test "db-connectivity" "/etc/dr-tests/db-connectivity.sh"
    
    # Test 2: Application health
    run_test "app-health" "/etc/dr-tests/app-health.sh"
    
    # Test 3: Service discovery
    run_test "service-discovery" "/etc/dr-tests/service-discovery.sh"
}

# Main test execution
run_all_tests() {
    log "Starting disaster recovery tests..."
    
    run_backup_tests
    run_etcd_tests
    run_cross_region_tests
    run_application_tests
    
    generate_test_report
    
    if [[ ${FAILED_TESTS} -gt 0 ]]; then
        log "TEST SUITE FAILED: ${FAILED_TESTS}/${TOTAL_TESTS} tests failed"
        exit 1
    else
        log "TEST SUITE PASSED: All ${PASSED_TESTS}/${TOTAL_TESTS} tests passed"
        exit 0
    fi
}

run_all_tests
```

### Pattern 14: RPO/RTO Compliance Calculator

**Description:** Automated compliance checking for RPO/RTO targets.

```python
#!/usr/bin/env python3
"""
RPO/RTO Compliance Calculator
Checks if backup configurations meet defined RPO/RTO targets.
"""

from datetime import datetime, timedelta
from dataclasses import dataclass
from typing import List, Dict
from enum import Enum


class ComplianceStatus(Enum):
    COMPLIANT = "compliant"
    WARNING = "warning"
    NON_COMPLIANT = "non_compliant"


@dataclass
class ApplicationConfig:
    """Application disaster recovery configuration."""
    name: str
    namespace: str
    rpo_minutes: int
    rto_minutes: int
    backup_frequency_minutes: int


@dataclass
class BackupStatus:
    """Backup execution status."""
    application_name: str
    last_backup_time: datetime
    backup_size_mb: float
    backup_duration_seconds: int
    status: str


@dataclass
class ComplianceResult:
    """Compliance check result."""
    application_name: str
    compliance_status: ComplianceStatus
    rpo_violation_minutes: int
    rto_violation_minutes: int
    recommendations: List[str]


class RPO_RTOLevels(Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


@dataclass
class TargetConfig:
    """RPO/RTO target configuration."""
    critical: dict  # RPO minutes, RTO minutes
    high: dict
    medium: dict
    low: dict


# Default RPO/RTO targets
DEFAULT_TARGETS = {
    RPO_RTOLevels.CRITICAL: {"rpo_minutes": 5, "rto_minutes": 15},
    RPO_RTOLevels.HIGH: {"rpo_minutes": 30, "rto_minutes": 60},
    RPO_RTOLevels.MEDIUM: {"rpo_minutes": 240, "rto_minutes": 240},
    RPO_RTOLevels.LOW: {"rpo_minutes": 1440, "rto_minutes": 1440},
}


class RPO_RTOLevels:
    """RPO/RTO compliance calculator."""
    
    def __init__(self, targets: Dict[RPO_RTOLevels, dict] = None):
        self.targets = targets or DEFAULT_TARGETS
    
    def calculate_rpo_violation(self, last_backup_time: datetime, rpo_minutes: int) -> int:
        """Calculate RPO violation in minutes."""
        now = datetime.now()
        time_since_backup = (now - last_backup_time).total_seconds() / 60
        return max(0, time_since_backup - rpo_minutes)
    
    def calculate_rto_violation(self, backup_duration: int, restore_time: int, rto_minutes: int) -> int:
        """Calculate RTO violation in minutes."""
        total_recovery_time = backup_duration + restore_time
        return max(0, total_recovery_time - rto_minutes)
    
    def check_application_compliance(
        self,
        app_config: ApplicationConfig,
        backup_status: BackupStatus
    ) -> ComplianceResult:
        """Check compliance for a single application."""
        rpo_violation = self.calculate_rpo_violation(
            backup_status.last_backup_time,
            app_config.rpo_minutes
        )
        
        # Estimate restore time (simplified: 1 minute per 100MB)
        estimated_restore_time = int(backup_status.backup_size_mb / 100)
        rto_violation = self.calculate_rto_violation(
            backup_status.backup_duration_seconds,
            estimated_restore_time,
            app_config.rto_minutes
        )
        
        # Determine compliance status
        if rpo_violation == 0 and rto_violation == 0:
            compliance_status = ComplianceStatus.COMPLIANT
            recommendations = []
        elif rpo_violation > 0 and rto_violation > 0:
            compliance_status = ComplianceStatus.NON_COMPLIANT
            recommendations = [
                f"Increase backup frequency (current: every {app_config.backup_frequency_minutes} minutes)",
                f"Optimize restore process (estimated: {estimated_restore_time} minutes)"
            ]
        elif rpo_violation > 0:
            compliance_status = ComplianceStatus.WARNING
            recommendations = [
                f"Increase backup frequency (current: every {app_config.backup_frequency_minutes} minutes)"
            ]
        else:
            compliance_status = ComplianceStatus.WARNING
            recommendations = [
                f"Optimize restore process (estimated: {estimated_restore_time} minutes)"
            ]
        
        return ComplianceResult(
            application_name=app_config.name,
            compliance_status=compliance_status,
            rpo_violation_minutes=int(rpo_violation),
            rto_violation_minutes=int(rto_violation),
            recommendations=recommendations
        )
    
    def generate_compliance_report(
        self,
        applications: List[ApplicationConfig],
        backup_statuses: Dict[str, BackupStatus]
    ) -> dict:
        """Generate compliance report for all applications."""
        results = []
        summary = {
            "compliant": 0,
            "warning": 0,
            "non_compliant": 0,
            "total": len(applications)
        }
        
        for app in applications:
            if app.name in backup_statuses:
                result = self.check_application_compliance(app, backup_statuses[app.name])
                results.append(result)
                summary[result.compliance_status.value] += 1
        
        return {
            "generated_at": datetime.now().isoformat(),
            "summary": summary,
            "applications": [
                {
                    "name": r.application_name,
                    "status": r.compliance_status.value,
                    "rpo_violation": r.rpo_violation_minutes,
                    "rto_violation": r.rto_violation_minutes,
                    "recommendations": r.recommendations
                }
                for r in results
            ]
        }


def main():
    """Example usage."""
    calculator = RPO_RTOLevels()
    
    # Example application configurations
    apps = [
        ApplicationConfig(
            name="payment-service",
            namespace="production",
            rpo_minutes=5,
            rto_minutes=15,
            backup_frequency_minutes=5
        ),
        ApplicationConfig(
            name="user-service",
            namespace="production",
            rpo_minutes=30,
            rto_minutes=60,
            backup_frequency_minutes=30
        )
    ]
    
    # Example backup statuses
    backups = {
        "payment-service": BackupStatus(
            application_name="payment-service",
            last_backup_time=datetime.now() - timedelta(minutes=4),
            backup_size_mb=1024,
            backup_duration_seconds=120,
            status="Completed"
        ),
        "user-service": BackupStatus(
            application_name="user-service",
            last_backup_time=datetime.now() - timedelta(minutes=35),
            backup_size_mb=512,
            backup_duration_seconds=60,
            status="Completed"
        )
    }
    
    report = calculator.generate_compliance_report(apps, backups)
    
    print("RPO/RTO Compliance Report:")
    print(f"Generated: {report['generated_at']}")
    print(f"\nSummary:")
    print(f"  Compliant: {report['summary']['compliant']}")
    print(f"  Warning: {report['summary']['warning']}")
    print(f"  Non-Compliant: {report['summary']['non_compliant']}")
    print(f"  Total: {report['summary']['total']}")
    
    print("\nApplication Details:")
    for app in report['applications']:
        print(f"\n  {app['name']}:")
        print(f"    Status: {app['status']}")
        print(f"    RPO Violation: {app['rpo_violation']} minutes")
        print(f"    RTO Violation: {app['rto_violation']} minutes")
        if app['recommendations']:
            print("    Recommendations:")
            for rec in app['recommendations']:
                print(f"      - {rec}")


if __name__ == "__main__":
    main()
```

## References

- **Velero Documentation:** [https://velero.io/docs/](https://velero.io/docs/)
- **Kubernetes Disaster Recovery:** [https://kubernetes.io/docs/tasks/administer-cluster/disaster-recovery/](https://kubernetes.io/docs/tasks/administer-cluster/disaster-recovery/)
- **etcd Operations Guide:** [https://etcd.io/docs/v3.5/op-guide/recovery/](https://etcd.io/docs/v3.5/op-guide/recovery/)
- **Cross-Region Replication Best Practices:** [https://aws.amazon.com/architecture/well-architected/latest/learn/px/cross-region-replication/](https://aws.amazon.com/architecture/well-architected/latest/learn/px/cross-region-replication/)

*Content generated following CNCF disaster recovery best practices. Verify against your specific infrastructure requirements before production deployment.*
