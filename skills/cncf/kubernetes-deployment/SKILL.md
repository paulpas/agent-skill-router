---
name: kubernetes-deployment
description: Implements apps/v1 Deployment YAML manifests with rolling update strategies, replica scaling, and rollback procedures for stateless application workloads.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: cncf
  triggers: rolling update, replica count, deployment strategy, rollback, apps/v1, deployment rollout, kubernetes deployment
  archetypes:
    - tactical
    - generation
  anti_triggers:
    - stateful persistence
    - stable network identity
    - ordered pod lifecycle
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, config, do-dont]
  related-skills: cncf/kubernetes-deployment, cncf/kubernetes-services-management, cncf/kubernetes-configmap
---

# Kubernetes Deployment Manager

Implements apps/v1 Deployment YAML manifests for stateless application workloads with rolling update strategies, replica management, and controlled rollback procedures. When loaded, the model generates production-grade Deployment resources with proper strategy configuration, health probes, and rollout monitoring.

## TL;DR Checklist

- [ ] Use `apps/v1` API version — never `extensions/v1beta1` or `apps/v1beta1`
- [ ] Set `strategy.type: RollingUpdate` with explicit `maxSurge` and `maxUnavailable`
- [ ] Define `minReadySeconds` to prevent premature rollout of next batch
- [ ] Include `livenessProbe` and `readinessProbe` with appropriate initial delays
- [ ] Never use `strategy.type: Recreate` for zero-downtime deployments
- [ ] Verify rollout status with `kubectl rollout status` before proceeding

---

## When to Use

Use this skill when:

- Creating a Deployment manifest for a stateless application (web servers, API services, worker processes)
- Configuring rolling update parameters to control rollout speed and safety
- Implementing rollback procedures for failed deployments
- Scaling replica count for horizontal capacity adjustments
- Managing deployment strategy for blue-green or canary deployment patterns

---

## When NOT to Use

Avoid this skill for:

- Stateful applications requiring stable network IDs — use `kubernetes-statefulset` instead
- Pods needing guaranteed ordering during creation/deletion — use `kubernetes-statefulset` instead
- Persistent storage per replica — use `kubernetes-persistentvolume` with StatefulSet
- Single-instance workloads that should never run in parallel — consider a Job instead

---

## Core Workflow

1. **Determine Deployment Requirements** — Identify replica count, container image, ports, and resource limits. **Checkpoint:** Verify the application is stateless (no local disk writes, no sticky sessions) — if not, StatefulSet is required.

2. **Define Pod Template Spec** — Create the `spec.template.spec` with containers, ports, environment variables, volume mounts, and security context. **Checkpoint:** Every container must have a `livenessProbe` and `readinessProbe` configured.

3. **Configure Rolling Update Strategy** — Set `strategy.type: RollingUpdate` with `rollingUpdate.maxSurge` and `rollingUpdate.maxUnavailable`. **Checkpoint:** `maxSurge` and `maxUnavailable` must sum to no more than 50% of replicas for safe scaling, unless explicitly tolerating temporary excess.

4. **Set Replicas and Selector** — Define `spec.replicas` and a `spec.selector.matchLabels` that matches the pod template labels. **Checkpoint:** Selector labels must exactly match `spec.template.metadata.labels` — mismatched selectors cause deployment rejection.

5. **Create and Validate Manifest** — Apply the manifest with `kubectl apply -f deployment.yaml --dry-run=client` then `kubectl apply -f deployment.yaml`. **Checkpoint:** Run `kubectl rollout status deploy/<name>` and verify all pods reach Ready state.

6. **Plan Rollback Path** — Keep the previous revision history available. Use `kubectl rollout undo deploy/<name>` if the new version shows errors. **Checkpoint:** Monitor pod logs and metrics during the first 60 seconds after each rollout.

---

## Implementation Patterns

### Pattern 1: Production-Grade Deployment Manifest

A complete Deployment with rolling update strategy, health probes, resource limits, and proper labeling for service discovery.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-frontend
  namespace: production
  labels:
    app: web-frontend
    tier: frontend
    version: v2.1.0
spec:
  replicas: 3
  revisionHistoryLimit: 5
  selector:
    matchLabels:
      app: web-frontend
      tier: frontend
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
      minReadySeconds: 30
  template:
    metadata:
      labels:
        app: web-frontend
        tier: frontend
        version: v2.1.0
    spec:
      terminationGracePeriodSeconds: 30
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      containers:
        - name: web-frontend
          image: registry.example.com/web-frontend:2.1.0
          ports:
            - containerPort: 8080
              protocol: TCP
              name: http
          env:
            - name: APP_ENV
              value: production
            - name: LOG_LEVEL
              valueFrom:
                configMapKeyRef:
                  name: app-config
                  key: log-level
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 10
            timeoutSeconds: 3
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 2
            failureThreshold: 3
          volumeMounts:
            - name: config-volume
              mountPath: /etc/app/config
              readOnly: true
      volumes:
        - name: config-volume
          configMap:
            name: app-config
```

### Pattern 2: Rolling Update Strategy Configuration (BAD vs GOOD)

Configuring the rolling update strategy incorrectly can cause service downtime or excessive resource usage.

```yaml
# ❌ BAD — default strategy causes unpredictable rollout behavior
# maxSurge and maxUnavailable are unset, using defaults (25%/25%) which
# may take down too many pods or spin up too many simultaneously.
strategy:
  type: RollingUpdate

# ❌ BAD — Recreate strategy causes full downtime on every deployment
strategy:
  type: Recreate

# ✅ GOOD — explicit RollingUpdate with conservative safety parameters
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1            # Only add 1 extra pod during rollout
    maxUnavailable: 0      # Never reduce below desired replica count
    minReadySeconds: 30    # Wait 30s after pod becomes ready before proceeding

# ✅ GOOD — aggressive strategy for development environments with low risk
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 2
    maxUnavailable: 1
    minReadySeconds: 5
```

### Pattern 3: Deployment Rollback Procedure

Programmatic rollback logic using kubectl commands and manifest versioning.

```yaml
# Rollback to previous revision
# kubectl rollout undo deployment/web-frontend -n production

# Rollback to a specific revision (if history is preserved)
# kubectl rollout undo deployment/web-frontend -n production --to-revision=2

# View rollout history
# kubectl rollout history deployment/web-frontend -n production

# View details of a specific revision
# kubectl rollout history deployment/web-frontend -n production --revision=3

# View rollout status after apply or undo
# kubectl rollout status deployment/web-frontend -n production --timeout=120s

# Pause and resume rollouts for manual approval gates
# kubectl rollout pause deployment/web-frontend -n production
# kubectl rollout resume deployment/web-frontend -n production
```

```python
def check_deployment_healthy(name: str, namespace: str, timeout_seconds: int = 120) -> bool:
    """Check if a Deployment rollout completed successfully.

    Uses kubectl rollout status to verify all pods are Ready.
    Returns True if healthy, False if timeout or failure detected.

    Args:
        name: Deployment name.
        namespace: Kubernetes namespace.
        timeout_seconds: Maximum time to wait for rollout.

    Returns:
        True if rollout completed successfully, False otherwise.
    """
    import subprocess
    try:
        result = subprocess.run(
            ["kubectl", "rollout", "status", f"deploy/{name}",
             "-n", namespace, f"--timeout={timeout_seconds}s"],
            capture_output=True, text=True, timeout=timeout_seconds + 10
        )
        return result.returncode == 0 and "successfully rolled out" in result.stdout
    except subprocess.TimeoutExpired:
        return False
    except FileNotFoundError:
        return False
```

---

## Constraints

### MUST DO
- Always use `apps/v1` API version — never `extensions/v1beta1` or `apps/v1beta1` (both are removed in Kubernetes 1.16+)
- Set explicit `strategy.type: RollingUpdate` with concrete `maxSurge` and `maxUnavailable` values
- Define both `livenessProbe` and `readinessProbe` on every container — never rely on defaults
- Use `resources.requests` and `resources.limits` on every container for proper scheduling and QoS
- Include `terminationGracePeriodSeconds` (≥ 30s for graceful shutdown) in the pod spec
- Match `spec.selector.matchLabels` exactly to `spec.template.metadata.labels`
- Set `revisionHistoryLimit: 5` to preserve rollout history for rollbacks
- Use `minReadySeconds` (≥ 15s) to ensure pods are truly ready before the next batch starts

### MUST NOT DO
- Never use `strategy.type: Recreate` for production stateless workloads — it causes full downtime
- Never omit `livenessProbe` or `readinessProbe` — the node cannot detect unhealthy pods otherwise
- Never set `maxUnavailable` to the total replica count — this allows complete outage during rollout
- Never use `latest` tag in production images — always pin to a specific image digest or semver tag
- Never set `terminationGracePeriodSeconds: 0` — in-flight requests will be dropped on pod deletion
- Never match selector labels to pods outside this Deployment — it can cause unexpected pod management

---

## Output Template

When implementing a Kubernetes Deployment, produce the following:

1. **Deployment YAML** — Complete `apps/v1` Deployment manifest with `metadata`, `spec.replicas`, `spec.strategy`, `spec.selector`, and `spec.template` fully defined.
2. **Strategy Rationale** — Brief explanation of chosen `maxSurge`, `maxUnavailable`, and `minReadySeconds` values relative to the replica count.
3. **Probe Configuration** — Document the health check endpoints, intervals, and thresholds for liveness and readiness probes.
4. **Rollback Plan** — Command sequence for undoing the deployment if issues arise, including the revision number to target.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `kubernetes-services-management` | Expose the Deployment via ClusterIP, NodePort, or LoadBalancer service |
| `kubernetes-ingress` | Route external HTTP/HTTPS traffic to the Deployment's service |
| `kubernetes-configmap` | Inject configuration data into the Deployment via env vars or volume mounts |
| `kubernetes-statefulset` | Deploy stateful applications that need stable network identities and persistent storage |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Kubernetes Deployments Documentation](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/) — Official guide to Deployment concepts, strategies, and lifecycle
- [Rolling Updates and Rollbacks](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#rolling-update-deployment) — How rolling updates work and rollback procedures
- [Deployment Strategy Types](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#strategy) — RollingUpdate vs Recreate strategy configuration
- [Probes Documentation](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle#container-probes) — Liveness, readiness, and startup probe configuration
- [Pod Security Context](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/) — Security context settings for containers and pods
- [Kubernetes API Reference — apps/v1 Deployment](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.32/#deployment-v1-apps) — Complete API schema for Deployment resources
- [Resource Management for Pods and Containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/) — CPU and memory requests/limits configuration
