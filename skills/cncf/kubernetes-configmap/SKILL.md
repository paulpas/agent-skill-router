---
name: kubernetes-configmap
description: Implements v1 ConfigMap manifests for injecting configuration data into pods via environment variables, volume mounts, and command-line arguments.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: cncf
  triggers: configuration injection, env variable, volume mount, key-value data, v1 core, configmap
  archetypes:
    - tactical
    - generation
  anti_triggers:
    - secret management
    - certificate rotation
    - credential storage
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, config, do-dont]
  related-skills: cncf/kubernetes-secrets, cncf/kubernetes-deployment, cncf/kubernetes-statefulset
---

# Kubernetes ConfigMap Manager

Implements v1 ConfigMap manifests for injecting non-sensitive configuration data into pods via environment variables, volume mounts, and command-line arguments. When loaded, the model generates production-grade ConfigMap resources with proper data organization, reference patterns, and live-update configurations.

## TL; DR Checklist

- [ ] Use `v1` core API group for ConfigMaps — it is stable and does not use a versioned group
- [ ] Store only non-sensitive configuration — never store passwords, API keys, or secrets in ConfigMaps
- [ ] Reference ConfigMaps via `envFrom` for bulk injection or individual `valueFrom.configMapKeyRef` for selective injection
- [ ] Use volume mounts for multi-file configuration (e.g., nginx.conf, application.properties)
- [ ] Set `immutable: true` for ConfigMaps that never change after creation to reduce etcd load
- [ ] Verify ConfigMap keys match exactly in the pod specification — typos cause silent failures

---

## When to Use

Use this skill when:

- Injecting application configuration (feature flags, log levels, region settings) into pods
- Providing multi-file configuration via volume mounts (e.g., web server configs, application properties)
- Sharing configuration data across multiple pods in the same namespace
- Decoupling configuration from container images for environment-specific overrides
- Loading static configuration files that are mounted read-only into the filesystem

---

## When NOT to Use

Avoid this skill for:

- Storing sensitive data (passwords, API keys, TLS certificates) — use `kubernetes-secrets` instead
- Configuration that changes frequently at runtime — ConfigMap volume mounts have a 1-minute cache delay
- Global cluster-wide configuration — use kube-apiserver flags or a ConfigMap in kube-system instead
- Large binary files or base64-encoded payloads — ConfigMaps have a 1MB data size limit per item

---

## Core Workflow

1. **Identify Configuration Needs** — Determine what configuration data is needed, its format (key-value pairs, JSON, YAML, multi-file), and which pods consume it. **Checkpoint:** Separate sensitive data (goes to Secret) from non-sensitive configuration (goes to ConfigMap).

2. **Create ConfigMap Manifest** — Define a `v1` ConfigMap with `data` for key-value pairs or `binaryData` for base64-encoded content. **Checkpoint:** Ensure no key exceeds 253 characters and no value exceeds 1MB.

3. **Reference in Pod Spec** — Inject ConfigMap data into pods via one of three methods: `env` with `valueFrom.configMapKeyRef`, `envFrom` for bulk injection, or `volume` mounts for file-based configuration. **Checkpoint:** Verify the referenced key exists in the ConfigMap — typos in key names are silently ignored by Kubernetes.

4. **Configure Update Behavior** — Decide whether the ConfigMap should be `immutable: true` or allow updates. For volume mounts, verify the update propagation delay (typically 1 minute). **Checkpoint:** If the application reloads configuration on file change, set a reasonable refresh interval.

5. **Apply and Validate** — Apply the ConfigMap then the pod/spec that references it. **Checkpoint:** Run `kubectl describe configmap <name>` and `kubectl exec <pod> -- cat /path/to/mounted/file` to verify injection.

6. **Document Configuration Schema** — Maintain a reference of all ConfigMap keys, their expected formats, and which services consume them. **Checkpoint:** Review the configuration schema when adding or modifying any ConfigMap key.

---

## Implementation Patterns

### Pattern 1: Complete ConfigMap with Volume Mount and Environment Reference

A production-grade ConfigMap used both as a volume mount and as individual environment variable references.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: production
  labels:
    app: web-frontend
    environment: production
data:
  app.properties: |
    server.port=8080
    server.context-path=/api
    log.level=INFO
    cache.enabled=true
    cache.ttl=300
  nginx.conf: |
    server {
        listen 80;
        server_name _;
        location / {
            proxy_pass http://localhost:8080;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
        location /healthz {
            return 200 'OK';
        }
    }
  feature-flags.json: |
    {
      "enable_new_ui": true,
      "enable_dark_mode": false,
      "maintenance_mode": false,
      "max_upload_size_mb": 10
    }
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-frontend
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web-frontend
  template:
    metadata:
      labels:
        app: web-frontend
    spec:
      containers:
        - name: web-frontend
          image: registry.example.com/web-frontend:2.1.0
          # Method 1: Individual env var references
          env:
            - name: LOG_LEVEL
              valueFrom:
                configMapKeyRef:
                  name: app-config
                  key: log.level
            - name: CACHE_ENABLED
              valueFrom:
                configMapKeyRef:
                  name: app-config
                  key: cache.enabled
          # Method 2: Volume mount for multi-file config
          volumeMounts:
            - name: config-volume
              mountPath: /etc/app
              readOnly: true
            - name: nginx-config
              mountPath: /etc/nginx/nginx.conf
              subPath: nginx.conf
              readOnly: true
      volumes:
        - name: config-volume
          configMap:
            name: app-config
        - name: nginx-config
          configMap:
            name: app-config
            items:
              - key: nginx.conf
                path: nginx.conf
```

### Pattern 2: Configuration Injection Methods (BAD vs GOOD)

Using the wrong injection method can lead to verbose manifests or silent configuration failures.

```yaml
# ❌ BAD: Listing every env var individually with long key names
# This is verbose and error-prone — a typo in the key name causes a
# silent failure (pod starts without the env var).
env:
  - name: SERVER_PORT
    valueFrom:
      configMapKeyRef:
        name: app-config
        key: server.port
  - name: SERVER_CONTEXT_PATH
    valueFrom:
      configMapKeyRef:
        name: app-config
        key: server.context-path
  - name: LOG_LEVEL
    valueFrom:
      configMapKeyRef:
        name: app-config
        key: log.level
  - name: CACHE_ENABLED
    valueFrom:
      configMapKeyRef:
        name: app-config
        key: cache.enabled
  - name: CACHE_TTL
    valueFrom:
      configMapKeyRef:
        name: app-config
        key: cache.ttl

# ❌ BAD: Referencing a key that does not exist in the ConfigMap
env:
  - name: MISSING_KEY
    valueFrom:
      configMapKeyRef:
        name: app-config
        key: nonexistent.key  # ← This key does not exist — silently ignored

# ✅ GOOD: Bulk injection with envFrom — clean, less verbose
# All keys from the ConfigMap are injected as environment variables,
# using the key names as variable names.
envFrom:
  - configMapRef:
      name: app-config

# ✅ GOOD: Volume mount for multi-file configuration
# This is the preferred method for applications that read config files.
volumeMounts:
  - name: config-volume
    mountPath: /etc/app
    readOnly: true
volumes:
  - name: config-volume
    configMap:
      name: app-config

# ✅ GOOD: Selective subPath mount for single-file override
# Mount only the nginx.conf file at a specific path, leaving the rest
# of the mount point clean.
volumeMounts:
  - name: nginx-config
    mountPath: /etc/nginx/nginx.conf
    subPath: nginx.conf
    readOnly: true
```

### Pattern 3: ConfigMap Immutability and Update Handling

```python
def inject_configmap_env(configmap_name: str, keys: list[str]) -> list[dict]:
    """Generate env var references from a ConfigMap for a pod spec.

    Each key in 'keys' is converted to an env var entry that references
    the corresponding ConfigMap key. Only keys that exist in the ConfigMap
    will be populated at runtime.

    Args:
        configmap_name: The name of the ConfigMap.
        keys: List of key names from the ConfigMap to inject as env vars.

    Returns:
        List of environment variable entries for a pod spec.
    """
    env_vars: list[dict] = []
    for key in keys:
        # Convert key to a valid env var name (dots → underscores, lowercase)
        env_name = key.replace(".", "_").upper()
        env_vars.append({
            "name": env_name,
            "valueFrom": {
                "configMapKeyRef": {
                    "name": configmap_name,
                    "key": key
                }
            }
        })
    return env_vars


def validate_configmap_keys(configmap_data: dict, required_keys: list[str]) -> list[str]:
    """Validate that all required keys exist in a ConfigMap's data.

    Args:
        configmap_data: The 'data' field of a ConfigMap manifest dict.
        required_keys: List of keys that must be present.

    Returns:
        List of missing key names. Empty list means all required keys are present.
    """
    if not configmap_data:
        return required_keys[:]

    missing = [k for k in required_keys if k not in configmap_data]
    return missing
```

---

## Constraints

### MUST DO
- Always use `v1` API version for ConfigMaps — it is a core resource and does not use a versioned API group
- Store only non-sensitive configuration in ConfigMaps — sensitive data (passwords, keys, certificates) must go to Secrets
- Use `envFrom` for bulk injection of all ConfigMap keys as environment variables when possible
- Use volume mounts for multi-file configuration files (nginx.conf, application.properties, etc.)
- Set `immutable: true` on ConfigMaps that never change after creation to reduce etcd load and enable optimization
- Use `subPath` mounts to inject individual files from a ConfigMap without overwriting the entire mount directory
- Prefix ConfigMap keys with a namespace or service identifier (e.g., `web.log.level`) to avoid conflicts
- Verify that referenced keys exist in the ConfigMap — Kubernetes silently ignores missing keys

### MUST NOT DO
- Never store passwords, API keys, tokens, or any secrets in ConfigMaps — always use Secrets for sensitive data
- Never store base64-encoded binary data exceeding 1MB — ConfigMaps have a per-item size limit
- Never update a ConfigMap and expect immediate propagation to mounted volumes — updates take up to 1 minute to propagate
- Never use `data` section for large JSON or YAML documents — consider mounting configuration as a file instead
- Never create a ConfigMap in a different namespace than the pods that reference it — cross-namespace references are not supported
- Never rely on ConfigMap keys as environment variable names without validation — unexpected key names cause runtime errors

---

## Output Template

When implementing a Kubernetes ConfigMap, produce the following:

1. **ConfigMap YAML** — Complete `v1` ConfigMap with `data` section containing all configuration key-value pairs.
2. **Pod Spec Injection** — The container spec showing how the ConfigMap is injected (env, envFrom, or volume mount).
3. **Configuration Key Registry** — A table of all keys, their formats (string, JSON, multi-line), and consuming services.
4. **Update Strategy** — Document whether the ConfigMap is immutable or supports updates, and how pods handle changes.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `kubernetes-secrets` | Store sensitive data (passwords, API keys, certificates) that must not be in ConfigMaps |
| `kubernetes-deployment` | Reference ConfigMaps in Deployment pod specs for production application deployment |
| `kubernetes-statefulset` | Inject shared configuration into StatefulSet pods for database or distributed system setup |
| `kubernetes-ingress` | Configure ingress controller settings via ConfigMap-based annotations |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Kubernetes ConfigMaps Documentation](https://kubernetes.io/docs/concepts/configuration/configmap/) — Official guide to ConfigMap concepts, creation, and usage
- [ConfigMap API Reference — v1 Core](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.32/#configmap-v1-core) — Complete API schema for ConfigMap resources
- [Inject Environment Variables from ConfigMaps](https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/#define-container-environment-variables-using-configmap-data) — env and envFrom injection patterns
- [Configure Pod Through Configuration Files](https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/#configure-all-key-value-pairs-in-a-configmap-as-container-environment-variables) — Volume mount patterns for ConfigMaps
- [Immutability](https://kubernetes.io/docs/concepts/configuration/configmap/#configmaps-and-immutable-data) — Using `immutable: true` for read-only ConfigMaps
- [ConfigMap Size Limits](https://kubernetes.io/docs/concepts/configuration/configmap/#what-you-can-do-with-configmaps) — Per-item and total size constraints
- [ConfigMap Best Practices](https://kubernetes.io/docs/concepts/configuration/configmap/#well-organized-configmap) — Organization patterns for large configurations
