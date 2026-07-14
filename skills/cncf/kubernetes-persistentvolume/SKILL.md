---
name: kubernetes-persistentvolume
description: Implements v1 PersistentVolume, StorageClass, and PersistentVolumeClaim manifests with static/dynamic provisioning, access modes, and reclaim policies for Kubernetes storage.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: cncf
  triggers: static provisioning, dynamic provisioning, storage class, access modes, reclaim policy, pv, pvc, storage.k8s.io
  archetypes:
    - tactical
    - generation
  anti_triggers:
    - pod isolation
    - ingress egress rules
    - rolling update
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, config, do-dont]
  related-skills: cncf/kubernetes-statefulset, cncf/kubernetes-deployment, cncf/crossplane
---

# Kubernetes PersistentVolume Manager

Implements v1 PersistentVolume (PV), StorageClass, and PersistentVolumeClaim (PVC) manifests for block and file storage provisioning in Kubernetes. When loaded, the model generates production-grade storage manifests with proper access modes, reclaim policies, and storage class configuration for both static and dynamic provisioning.

## TL;DR Checklist

- [ ] Use `v1` API version for PersistentVolume, PersistentVolumeClaim, and `storage.k8s.io/v1` for StorageClass
- [ ] Match PVC `accessModes` to the PV's supported access modes — mismatch causes Pending PVC state
- [ ] Set `reclaimPolicy: Retain` for production databases, `Delete` for ephemeral workloads
- [ ] Specify `storageClassName` explicitly — omitting it uses the default class or fails binding
- [ ] Use dynamic provisioning (StorageClass) for most workloads — static provisioning requires manual PV creation
- [ ] Never use `ReadWriteMany` with block storage — only filesystem-based volumes support it

---

## When to Use

Use this skill when:

- Provisioning persistent storage for stateful applications (databases, message brokers)
- Configuring storage classes with different performance tiers (SSD, HDD, NVMe)
- Implementing static provisioning with manually created PersistentVolumes
- Setting up reclaim policies for data lifecycle management
- Managing cross-namespace PVC-to-PV binding for multi-tenant clusters

---

## When NOT to Use

Avoid this skill for:

- Stateless application storage needs — use ephemeral `emptyDir` or `hostPath` volumes
- Temporary or scratch data that can be recreated — use `emptyDir` volumes
- Storage that does not require Kubernetes PV/PVC lifecycle management
- Direct cloud provider storage management — use cloud provider SDKs or tools instead

---

## Core Workflow

1. **Select Storage Type and Class** — Determine whether to use dynamic provisioning (StorageClass) or static provisioning (manual PV creation). **Checkpoint:** Verify the cluster has a provisioner configured for the desired storage backend (e.g., `kubernetes.io/aws-ebs`, `ebs.csi.aws.com`).

2. **Create StorageClass (if Dynamic)** — Define a `storage.k8s.io/v1` StorageClass with `provisioner`, `reclaimPolicy`, and parameters. **Checkpoint:** Ensure the provisioner string matches an installed CSI driver or in-tree provisioner.

3. **Create PersistentVolumeClaim** — Define a `v1` PVC with `accessModes`, `resources.requests.storage`, and `storageClassName`. **Checkpoint:** The PVC's `storageClassName` must match an available StorageClass or a manually created PV.

4. **Verify Binding** — Confirm the PVC transitions to `Bound` state. **Checkpoint:** Run `kubectl get pvc -n <namespace>` and verify the `STATUS` column shows `Bound`.

5. **Reference in Pod Spec** — Mount the bound PVC in a pod using a `volumeMount` referencing the PVC name. **Checkpoint:** The PVC `accessModes` must be compatible with the pod's access requirements (e.g., `ReadWriteOnce` pods cannot share `ReadWriteMany` volumes).

6. **Configure Data Lifecycle** — Set `reclaimPolicy` on the StorageClass or PV to control data retention on deletion. **Checkpoint:** For production databases, use `reclaimPolicy: Retain` to prevent accidental data loss.

---

## Implementation Patterns

### Pattern 1: Complete Dynamic and Static Provisioning Setup

Production-grade StorageClass and PersistentVolumeClaim manifests for both provisioning approaches.

```yaml
# StorageClass: High-performance SSD for production databases
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: premium-ssd
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  fsType: ext4
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
---
# StorageClass: Standard storage for development and test environments
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: standard-hdd
provisioner: ebs.csi.aws.com
parameters:
  type: gp2
  fsType: ext4
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: false
---
# PersistentVolumeClaim: High-performance storage for production database
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
  namespace: production
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: premium-ssd
  resources:
    requests:
      storage: 100Gi
  volumeMode: Filesystem
---
# PersistentVolumeClaim: Standard storage for application logs
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-logs
  namespace: production
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: nfs-storage
  resources:
    requests:
      storage: 10Gi
  volumeMode: Filesystem
---
# Pod: Mounting the PVCs in a StatefulSet
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: production
spec:
  serviceName: postgres-headless
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    spec:
      containers:
        - name: postgres
          image: postgres:16-alpine
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: postgres-data
```

### Pattern 2: Static Provisioning and Access Mode Matching (BAD vs GOOD)

Incorrect access mode specification or PV/PVC mismatch causes the classic `Pending` PVC state.

```yaml
# ❌ BAD: PVC requests ReadWriteMany but the storage class only supports ReadWriteOnce
# This PVC will remain in Pending state forever.
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: broken-pvc
spec:
  accessModes:
    - ReadWriteMany  # ← Most CSI drivers and cloud block storage only support RWO
  storageClassName: ebs-csi
  resources:
    requests:
      storage: 50Gi

# ❌ BAD: ReclaimPolicy: Delete on production database storage — data is lost on PVC deletion
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: prod-storage
reclaimPolicy: Delete  # ← Destructive for production workloads
volumeBindingMode: Immediate

# ❌ BAD: Static PV with mismatched access mode
# The PV supports ReadWriteOnce but the PVC requests ReadWriteOnce — they match,
# but if the PVC asked for ReadWriteMany, it would never bind.
apiVersion: v1
kind: PersistentVolume
metadata:
  name: static-pv
spec:
  capacity:
    storage: 50Gi
  accessModes:
    - ReadWriteOnce
  storageClassName: manual
  persistentVolumeReclaimPolicy: Retain
  hostPath:
    path: /data/static
  # ❌ hostPath is node-local — this PV can only bind to a pod on the same node

# ✅ GOOD: Access modes correctly specified for block storage
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: correct-pvc
spec:
  accessModes:
    - ReadWriteOnce  # ← Matches standard block storage capabilities
  storageClassName: premium-ssd
  resources:
    requests:
      storage: 100Gi
  volumeMode: Filesystem
---
# ✅ GOOD: Static PV with NFS for multi-pod sharing
apiVersion: v1
kind: PersistentVolume
metadata:
  name: nfs-static-pv
spec:
  capacity:
    storage: 50Gi
  accessModes:
    - ReadWriteMany  # ← NFS supports multiple readers/writers
  storageClassName: nfs-storage
  persistentVolumeReclaimPolicy: Retain
  nfs:
    server: nfs-server.example.com
    path: /exports/data
---
# ✅ GOOD: Volume expansion enabled for growing storage needs
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: expandable-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: premium-ssd
  resources:
    requests:
      storage: 50Gi  # ← Will expand to 100Gi when PVC is updated
  volumeMode: Filesystem
---
# To expand: update the PVC's storage request, then verify the PV expands
# kubectl patch pvc expandable-pvc -p '{"spec":{"resources":{"requests":{"storage":"100Gi"}}}}'
```

### Pattern 3: Storage Class Parameter Reference

```python
def select_storage_class(
    workload_type: str,
    performance_tier: str,
    required_access_mode: str
) -> str:
    """Select the appropriate StorageClass for a given workload.

    Maps workload requirements to the most suitable storage class in the cluster.

    Args:
        workload_type: Type of workload ('database', 'log', 'temp', 'backup').
        performance_tier: Performance requirement ('premium', 'standard', 'budget').
        required_access_mode: Required access mode ('ReadWriteOnce', 'ReadWriteMany', 'ReadOnlyMany').

    Returns:
        The name of the recommended StorageClass.
    """
    # Database workloads always need premium storage with retain policy
    if workload_type == "database":
        if performance_tier == "premium":
            return "premium-ssd"
        return "standard-hdd"

    # Log storage supports read-many for multi-pod aggregation
    if workload_type == "log":
        if required_access_mode == "ReadWriteMany":
            return "nfs-storage"
        return "standard-hdd"

    # Temporary storage can be deleted on reclaim
    if workload_type == "temp":
        return "ephemeral-ssd"

    # Backup requires retain policy for data safety
    if workload_type == "backup":
        return "premium-ssd"

    raise ValueError(f"Unknown workload type: {workload_type}")
```

---

## Constraints

### MUST DO
- Always specify `storageClassName` explicitly in PVCs — omitting it relies on the default class which may not be appropriate
- Match PVC `accessModes` to the StorageClass/PV capabilities — use `ReadWriteOnce` for block storage and `ReadWriteMany` only for NFS or distributed filesystems
- Set `reclaimPolicy: Retain` on StorageClasses used for production database storage — prevents accidental data loss
- Use `volumeBindingMode: WaitForFirstConsumer` for most workloads — delays PV binding until a pod is scheduled, enabling topology-aware provisioning
- Use `allowVolumeExpansion: true` on StorageClasses to allow PVCs to grow without migration
- Specify `volumeMode: Filesystem` (default) or `volumeMode: Block` explicitly based on the application's needs
- Verify PV/PVC binding with `kubectl get pv,pvc -n <namespace>` after creation

### MUST NOT DO
- Never use `hostPath` volumes for production workloads — they are node-local and survive node failure
- Never set `reclaimPolicy: Delete` on storage used for databases or any data that must be preserved
- Never request `ReadWriteMany` on block storage providers (EBS, Azure Disk, GCE PD) — they only support `ReadWriteOnce`
- Never create a PVC with a `storageClassName` that does not exist in the cluster — it will fail binding immediately
- Never use `volumeBindingMode: Immediate` with zone-sensitive storage — it may bind to a PV in a different zone than the pod
- Never assume a PVC is bound — always check `kubectl get pvc` status before relying on the storage

---

## Output Template

When implementing Kubernetes persistent storage, produce the following:

1. **StorageClass YAML** — StorageClass with provisioner, parameters, reclaim policy, and volume binding mode.
2. **PersistentVolumeClaim YAML** — PVC with access modes, storage requests, and storage class reference.
3. **PersistentVolume YAML** (if static) — Manually created PV with capacity, access modes, and storage backend details.
4. **Pod Volume Mount** — The container spec showing how the PVC is mounted and accessed.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `kubernetes-statefulset` | Use PVCs in StatefulSet volumeClaimTemplates for ordered persistent storage per pod |
| `kubernetes-deployment` | Reference PVCs in Deployment pods for shared persistent storage (single-writer access) |
| `cncf/crossplane` | Manage storage provisioning declaratively with Crossplane composite resources |
| `cncf/longhorn` | Use Longhorn as a distributed block storage solution with native Kubernetes integration |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Kubernetes Storage Documentation](https://kubernetes.io/docs/concepts/storage/) — Official guide to PV, PVC, StorageClass, and storage concepts
- [Persistent Volumes Documentation](https://kubernetes.io/docs/concepts/storage/persistent-volumes/) — PV lifecycle, provisioning, and binding behavior
- [Storage Classes Documentation](https://kubernetes.io/docs/concepts/storage/storage-classes/) — StorageClass parameters, provisioners, and reclaim policies
- [Persistent Volume Claim](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#persistentvolumeclaims) — PVC binding rules and access mode matching
- [CSI Driver Development](https://kubernetes-csi.github.io/docs/) — Container Storage Interface driver documentation
- [Volume Expansion](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#expanding-persistent-volumes-claims) — Growing PVC storage without data migration
- [StorageClass API Reference — storage.k8s.io/v1](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.32/#storageclass-v1-storage-k8s-io) — Complete API schema for StorageClass resources
