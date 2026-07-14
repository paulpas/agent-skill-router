---
name: kubernetes-statefulset
description: Implements apps/v1 StatefulSet manifests with stable network identities, ordered pod lifecycle, and persistent volume claim automation for stateful workloads.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: cncf
  triggers: stateful workload, stable network identity, persistent volume claim, ordered scaling, apps/v1, statefulset
  archetypes:
    - tactical
    - generation
  anti_triggers:
    - rolling update
    - replica count
    - deployment rollback
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, config, do-dont]
  related-skills: cncf/kubernetes-persistentvolume, cncf/kubernetes-services-management, cncf/kubernetes-configmap
---

# Kubernetes StatefulSet Manager

Implements apps/v1 StatefulSet manifests for stateful workloads that require stable network identities, ordered deployment and scaling, and persistent storage. When loaded, the model generates production-grade StatefulSet resources with headless service binding, ordered pod management, and volume claim templates.

## TL;DR Checklist

- [ ] Always pair StatefulSet with a headless service (clusterIP: None)
- [ ] Define `volumeClaimTemplates` in the StatefulSet spec for persistent storage
- [ ] Use `podManagementPolicy: OrderedReady` for ordered scaling (default — verify explicitly)
- [ ] Set `serviceName` to reference the headless service — this enables stable DNS names
- [ ] Never use StatefulSet for stateless workloads — use Deployment instead
- [ ] Verify PVCs persist after pod deletion — stateful workloads depend on data retention

---

## When to Use

Use this skill when:

- Running a database (MySQL, PostgreSQL, MongoDB, Cassandra) on Kubernetes
- Deploying distributed systems requiring stable hostnames and ordered member addition (etcd, Kafka, ZooKeeper)
- Managing message brokers with partitioned leader election (NATS, RabbitMQ with clustering)
- Implementing application layers that need predictable pod naming and DNS entries
- Orchestrating distributed systems where startup/shutdown order matters

---

## When NOT to Use

Avoid this skill for:

- Stateless web applications or API services — use `kubernetes-deployment` instead
- Short-lived batch processing jobs — use `kubernetes-jobs` or `kubernetes-cronjob` instead
- Applications that do not need stable network identities or persistent storage
- Workloads where scaling up and down must happen in parallel without ordering

---

## Core Workflow

1. **Create Headless Service** — Define a Service with `clusterIP: None` that selects pods by the StatefulSet's label selector. **Checkpoint:** The service `spec.selector` must match `spec.template.metadata.labels` of the StatefulSet exactly.

2. **Define StatefulSet Spec** — Create the StatefulSet with `serviceName`, `replicas`, `podManagementPolicy`, `updateStrategy`, and `volumeClaimTemplates`. **Checkpoint:** `serviceName` must reference the headless service created in step 1.

3. **Configure Volume Claim Templates** — Define `volumeClaimTemplates` with `accessModes`, `storageClassName`, and `resources.requests.storage`. **Checkpoint:** Each pod in the StatefulSet gets a uniquely numbered PVC (e.g., `data-<statefulset>-0`, `data-<statefulset>-1`).

4. **Set Update Strategy** — Choose `RollingUpdate` (default) with `partition` for progressive rollouts, or `OnDelete` for manual control. **Checkpoint:** With `partition`, only pods with ordinal ≥ partition get updated — verify ordinal numbering.

5. **Validate StatefulSet Creation** — Apply manifests and verify pods create in order (0, 1, 2...) and are deleted in reverse order (N, N-1, ..., 0). **Checkpoint:** Check DNS names: `<pod-name>.<headless-service-name>.<namespace>.svc.cluster.local`.

6. **Verify Persistent Storage** — Confirm PVCs persist after pod deletion and are reattached to the correct pod by ordinal. **Checkpoint:** Run `kubectl get pvc -l app=<statefulset-name>` and verify each PVC maps to the correct pod.

---

## Implementation Patterns

### Pattern 1: Complete StatefulSet with Headless Service

A production-grade StatefulSet for a database workload with headless service, ordered pod management, and persistent storage.

```yaml
---
apiVersion: v1
kind: Service
metadata:
  name: postgres-headless
  namespace: database
  labels:
    app: postgres
spec:
  ports:
    - port: 5432
      targetPort: 5432
      name: postgres
  clusterIP: None
  selector:
    app: postgres
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: database
  labels:
    app: postgres
    tier: database
spec:
  serviceName: postgres-headless
  replicas: 3
  podManagementPolicy: OrderedReady
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      partition: 0
  revisionHistoryLimit: 3
  selector:
    matchLabels:
      app: postgres
      tier: database
  template:
    metadata:
      labels:
        app: postgres
        tier: database
    spec:
      terminationGracePeriodSeconds: 60
      securityContext:
        runAsNonRoot: true
        runAsUser: 999
        fsGroup: 999
      containers:
        - name: postgres
          image: postgres:16-alpine
          ports:
            - containerPort: 5432
              name: postgres
          env:
            - name: POSTGRES_DB
              value: appdb
            - name: POSTGRES_USER
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: username
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: password
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              cpu: "1"
              memory: 2Gi
          livenessProbe:
            exec:
              command:
                - pg_isready
                - -U
                - "$(POSTGRES_USER)"
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
          readinessProbe:
            exec:
              command:
                - pg_isready
                - -U
                - "$(POSTGRES_USER)"
            initialDelaySeconds: 10
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: data
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: premium-ssd
        resources:
          requests:
            storage: 50Gi
```

### Pattern 2: Stable DNS Naming (BAD vs GOOD)

Understanding how StatefulSet DNS names differ from Deployment-style naming.

```yaml
# ❌ BAD: Service with clusterIP — pods get random names and load-balanced IPs
# No stable DNS entry per pod. Clients cannot address individual members.
apiVersion: v1
kind: Service
metadata:
  name: postgres-service
spec:
  type: ClusterIP  # ← This is wrong for StatefulSet
  selector:
    app: postgres

# ✅ GOOD: Headless service — each pod gets a stable DNS name
apiVersion: v1
kind: Service
metadata:
  name: postgres-headless
spec:
  clusterIP: None  # ← Headless: no load balancing, one A record per pod
  selector:
    app: postgres

# Result: Pod postgres-0 resolves to:
#   postgres-0.postgres-headless.database.svc.cluster.local
# Pod postgres-1 resolves to:
#   postgres-1.postgres-headless.database.svc.cluster.local
# This stable DNS is the core value of StatefulSet over Deployment.
```

### Pattern 3: Ordered Scaling and Partition Update

Controlled rollout and scaling for StatefulSets where order matters.

```yaml
# Ordered scaling: pods are created in order 0, 1, 2... and
# terminated in reverse order N, N-1, ..., 0
# This ensures leaders are demoted before followers are removed.

# Progressive update: only update pods with ordinal >= partition
spec:
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      partition: 1
  # Effect: pod-0 stays on old revision; pods 1,2,... get updated.
  # This allows manual verification of pod-0 before proceeding.

# To update pod-0 as well:
# kubectl patch statefulset postgres --type='json' \
#   -p='[{"op": "replace", "path": "/spec/updateStrategy/rollingUpdate/partition", "value": 0}]'

# Manual update strategy — only update when pod is deleted:
spec:
  updateStrategy:
    type: OnDelete
  # Use when each member requires manual data migration before update.

# Delete pods in reverse order for safe shutdown:
# kubectl delete pod postgres-2
# kubectl delete pod postgres-1
# kubectl delete pod postgres-0
# PVCs are retained automatically after pod deletion.
```

```python
def get_statefulset_pod_name(statefulset_name: str, ordinal: int) -> str:
    """Return the stable DNS name of a StatefulSet pod by ordinal.

    StatefulSet pods are named <statefulset-name>-<ordinal>, which provides
    deterministic identification for ordered operations.

    Args:
        statefulset_name: The name of the StatefulSet.
        ordinal: The zero-based ordinal of the pod.

    Returns:
        Stable pod name string.
    """
    if ordinal < 0:
        raise ValueError(f"Ordinal must be >= 0, got {ordinal}")
    return f"{statefulset_name}-{ordinal}"


def get_statefulset_dns_fqdn(
    pod_name: str,
    service_name: str,
    namespace: str
) -> str:
    """Construct the FQDN for a StatefulSet pod in the cluster DNS.

    Args:
        pod_name: The pod name (e.g., 'postgres-0').
        service_name: The headless service name.
        namespace: The Kubernetes namespace.

    Returns:
        Fully qualified DNS name for the pod.
    """
    if not pod_name or not service_name or not namespace:
        raise ValueError("pod_name, service_name, and namespace are required")
    return f"{pod_name}.{service_name}.{namespace}.svc.cluster.local"
```

---

## Constraints

### MUST DO
- Always create a headless service (`clusterIP: None`) before deploying the StatefulSet
- Set `serviceName` in the StatefulSet spec to the headless service name — this enables stable DNS
- Define `volumeClaimTemplates` with explicit `accessModes`, `storageClassName`, and storage request
- Use `podManagementPolicy: OrderedReady` (default) when startup/shutdown order matters
- Set `revisionHistoryLimit` to at least 3 to preserve rollout history
- Configure `terminationGracePeriodSeconds: 60` for databases to allow flush and sync
- Use `exec` probes for databases (`pg_isready`, `mysqladmin ping`) rather than HTTP probes
- Match the StatefulSet's `spec.selector.matchLabels` exactly to `spec.template.metadata.labels`

### MUST NOT DO
- Never use a regular ClusterIP service instead of a headless service — pods lose stable DNS
- Never mix StatefulSet with `strategy.type: Recreate` — it defeats ordered scaling
- Never set `volumeClaimTemplates` with `accessModes: ReadWriteMany` for single-writer databases
- Never scale a StatefulSet down and then back up expecting data to reappear — deleted pods' PVCs are retained
- Never set `replicas: 0` on a production StatefulSet without first draining data
- Never use `image: latest` tag on StatefulSet pods — data-corrupting image changes during rollouts are irreversible

---

## Output Template

When implementing a Kubernetes StatefulSet, produce the following:

1. **Headless Service YAML** — Service with `clusterIP: None`, proper port definitions, and matching selector labels.
2. **StatefulSet YAML** — Complete `apps/v1` StatefulSet with `serviceName`, `volumeClaimTemplates`, `updateStrategy`, and pod template.
3. **DNS Resolution Guide** — Document the stable DNS names each pod will resolve to and how clients should connect.
4. **Scaling Procedure** — Step-by-step commands for scaling up and down in the correct order, with verification steps.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `kubernetes-persistentvolume` | Configure the StorageClass and PV backing the StatefulSet's volumeClaimTemplates |
| `kubernetes-services-management` | Create additional ClusterIP services for service discovery and load balancing |
| `kubernetes-configmap` | Inject shared configuration into the StatefulSet pods via ConfigMap references |
| `kubernetes-deployment` | Use Deployment instead if your workload is stateless and does not need stable identities |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Kubernetes StatefulSets Documentation](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/) — Official guide to StatefulSet concepts, use cases, and lifecycle
- [Headless Services for StatefulSets](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#headless-services) — How headless services provide stable DNS for StatefulSet pods
- [Volume Claim Templates](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#stable-storage) — Persistent volume provisioning per pod ordinal
- [Pod Management Policies](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#pod-management-policies) — OrderedReady vs Parallel scaling behavior
- [Update Strategies](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#update-strategies) — RollingUpdate with partition and OnDelete strategies
- [Kubernetes API Reference — apps/v1 StatefulSet](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.32/#statefulset-v1-apps) — Complete API schema for StatefulSet resources
- [Database Deployment on Kubernetes](https://kubernetes.io/docs/tasks/run-application/run-replicated-stateful-application/) — Best practices for running replicated stateful applications
