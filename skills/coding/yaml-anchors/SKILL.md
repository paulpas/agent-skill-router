---




name: yaml-anchors
description: Implements YAML anchor and alias patterns (& and *) for configuration reuse, merge keys, and value referencing across Docker Compose, Kubernetes, and Helm files.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: yaml anchors, yaml aliases, & anchor, * alias, YAML merge key, docker-compose reuse, kubernetes config reuse
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, config]
  related-skills: docker-compose-patterns, kubernetes-configmap, helm-charts
  archetypes:
    - tactical
    - generation
  anti_triggers:
    - brainstorming
    - vague ideation
    - code golf
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational




---





# YAML Anchor and Alias Patterns

Implements YAML anchor (`&name`) and alias (`*name`) patterns — along with merge keys (`<<:`) — to eliminate configuration duplication in Docker Compose, Kubernetes manifests, Helm templates, and CI/CD pipeline definitions. When loaded, this skill makes the model design, refactor, and validate YAML documents that use structured composition instead of copy-pasted blocks.

## TL;DR Checklist

- [ ] Define anchors at a logical document level with descriptive snake_case names (&base_service_config, not &x)
- [ ] Use merge key `<<: *anchorName` to shallow-merge anchor mappings into child configs
- [ ] Verify no circular references exist between anchors and aliases
- [ ] Test anchor behavior under YAML 1.2 parsers (PyYAML >= 6.0, ruamel.yaml)
- [ ] Comment complex multi-anchor merge chains for readability

---

## When to Use

Use this skill when:

- Reducing duplication in Docker Compose, Kubernetes, or Helm configuration files where the same settings repeat across multiple services or environments
- Sharing common settings across many resources (e.g., logging drivers, health check configs, network policies) with only minor per-service overrides
- Building template-based deployments where dozens of resources share a base configuration pattern (Kubernetes Deployments, Helm values inheritance)
- Implementing configuration inheritance in YAML-based CI/CD pipelines (GitHub Actions reusable workflows, GitLab CI includes)
- Consolidating environment-specific configurations where staging and production differ only in replica counts, resource limits, or feature flags

## When NOT to Use

Avoid this skill for:

- Simple key-value pairs that don't justify the cognitive overhead of anchors (a single repeated port number should be a variable, not an anchor)
- Files with fewer than 3 duplicative blocks — anchors add indirection; if duplication appears only twice, copy-paste is clearer
- YAML 1.0 parsers where the merge key (`<<:`) behavior is undefined and inconsistent across implementations
- Deeply nested object graphs (3+ levels of anchor references within anchored nodes) where scoping becomes impossible to trace without a debugger

---

## Core Workflow

1. **Identify Duplicative Patterns** — Scan the entire YAML document for repeated configuration blocks. Look for: identical logging drivers, shared health check definitions, duplicate network configurations, or repeated deploy/resource specifications. Use structural comparison (not just visual) to catch variations.
   **Checkpoint:** If more than 2 structurally identical blocks exist with only minor field differences, proceed to create an anchor. Count the exact lines of duplication — if total saved exceeds 10 lines, anchors are justified.

2. **Define Anchor with Descriptive Name** — Place `&anchorName` on the mapping or scalar node being reused. Use descriptive snake_case names that reflect the semantic content, not its position in the file. Anchors must be unique within the document scope.
   ```yaml
   # Define anchors at a logical structural level, not nested inside another key's value
   _base_service_config: &base_service_config
     restart_policy: unless-stopped
     deploy:
       replicas: 3
       resources:
         limits:
           memory: 512M
           cpus: "0.5"
     healthcheck:
       test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
       interval: 30s
       timeout: 10s
       retries: 3
       start_period: 40s
     logging:
       driver: json-file
       options:
         max-size: "10m"
         max-file: "3"
   ```
   **Checkpoint:** Anchor name must be unique within the document — re-anchoring the same name silently overwrites previous definitions. Use a prefix like `_base_` to signal shared definition at a glance.

3. **Apply Alias or Merge Key** — For simple scalar value reuse, reference with `*anchorName` as a direct replacement node. For mapping inheritance, use `<<: *anchorName` merge key to shallow-merge all keys from the anchored mapping into the current context. Keys listed after the merge key override corresponding keys from the anchor.
   ```yaml
   services:
     api-server:
       <<: *base_service_config    # merges ALL keys from &base_service_config
       hostname: api-prod          # adds new key not present in anchor
       ports:
         - "8080:8080"             # new key — fully replaces if same name exists
       deploy:                     # nested object — ENTIRE mapping is REPLACED, not deep-merged
         replicas: 5               # override from within the new deploy mapping

     worker:
       <<: *base_service_config
       hostname: worker-prod
       command: ["python", "worker.py"]
       deploy:
         replicas: 3
   ```
   **Checkpoint:** Merge keys perform SHALLOW merge only — nested objects are entirely replaced, not recursively merged. If you need to override a nested property, re-define the entire parent mapping in the child.

4. **Override and Extend Per Service** — For each child configuration that references an anchor, specify ONLY the keys that differ from the base. Document intentional overrides with inline comments explaining why the value was changed.
   ```yaml
   services:
     api-server:
       <<: *base_service_config
       hostname: api-prod
       # Override replicas for high-traffic API service
       deploy:
         replicas: 5
         resources:
           limits:
             memory: 1G            # API needs more memory
             cpus: "1.0"
       ports:
         - "8080:8080"

     worker:
       <<: *base_service_config
       hostname: worker-prod
       # Workers run a different command but share the same infra settings
       command: ["python", "-m", "worker.main"]
   ```
   **Checkpoint:** Each override should be justified by a comment. If a child has no overrides at all, consider if it even needs its own entry or could use the anchor directly.

5. **Validate Under YAML 1.2 Parser** — Test file resolution with modern parsers before committing to CI/CD pipelines. Many cloud-native tools now ship YAML 1.2 parsers (PyYAML >= 6.0 switched defaults) which are stricter about merge key behavior and scalar types.
   ```python
   #!/usr/bin/env python3
   """Validate YAML anchor resolution across the configuration file."""

   import sys
   from pathlib import Path

   import yaml

   def validate_yaml_anchors(filepath: str) -> dict:
       """Parse a YAML file and verify all anchors resolved correctly.

       Returns a summary dict with success status and any errors found.
       """
       try:
           with open(filepath, "r") as f:
               config = yaml.safe_load(f)
       except yaml.YAMLError as exc:
           return {"success": False, "error": str(exc)}

       if not isinstance(config, dict):
           return {
               "success": False,
               "error": f"Expected top-level mapping, got {type(config).__name__}",
           }

       # Verify known anchor-merged structures are intact
       errors = []
       services = config.get("services", {})
       if not isinstance(services, dict):
           errors.append("'services' is missing or not a mapping")
           return {"success": False, "errors": errors}

       for svc_name, svc_config in services.items():
           restart = svc_config.get("restart_policy")
           if restart != "unless-stopped":
               errors.append(
                   f"Service '{svc_name}' missing inherited 'restart_policy'"
               )
           deploy = svc_config.get("deploy", {})
           if not isinstance(deploy, dict):
               errors.append(
                   f"Service '{svc_name}' deploy is not a mapping — "
                   f"anchor merge may have failed"
               )

       return {
           "success": len(errors) == 0,
           "errors": errors,
           "service_count": len(services),
       }

   if __name__ == "__main__":
       path = sys.argv[1] if len(sys.argv) > 1 else "docker-compose.yaml"
       result = validate_yaml_anchors(path)
       print(f"Anchors valid: {result['success']}")
       if result.get("errors"):
           for err in result["errors"]:
               print(f"  ERROR: {err}")
       else:
           print(f"  Validated {result['service_count']} services successfully")
   ```
   **Checkpoint:** Parse the file with both `yaml.safe_load()` and `ruamel.yaml.RoundTripLoader` to catch version-specific behavior differences. If either parser fails, the anchors are non-portable.

---

## Implementation Patterns

### Pattern 1: Docker Compose Service Inheritance

```yaml
# ── Base service definition (anchor for all services) ──
_base_service: &base_service_definition
  image: ${REGISTRY:-ghcr.io}/myorg/myapp:${TAG:-latest}
  restart_policy: unless-stopped
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s
  logging:
    driver: json-file
    options:
      max-size: "10m"
      max-file: "3"

# ── Production service overrides ──
services:
  api-server:
    <<: *base_service_definition
    hostname: api-prod
    ports:
      - "443:8080"
    deploy:
      replicas: 5
      resources:
        limits:
          memory: 1G
          cpus: "1.0"
    environment:
      NODE_ENV: production
      LOG_LEVEL: warn

  worker:
    <<: *base_service_definition
    hostname: worker-prod
    command: ["python", "-m", "celery.worker"]
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 2G
          cpus: "2.0"

  scheduler:
    <<: *base_service_definition
    hostname: scheduler-prod
    command: ["python", "-m", "celery.beat"]
```

### Pattern 2: Kubernetes ConfigMap + Deployment Reuse

```yaml
# ── Shared container spec anchor ──
_base_container: &base_container
  imagePullPolicy: IfNotPresent
  securityContext:
    runAsNonRoot: true
    readOnlyRootFilesystem: true
    allowPrivilegeEscalation: false
  resources:
    requests:
      memory: "128Mi"
      cpu: "100m"
    limits:
      memory: "512Mi"
      cpu: "500m"
  envFrom:
    - configMapRef:
        name: app-config

# ── Deployment with shared container template ──
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-api
spec:
  replicas: 3
  template:
    spec:
      containers:
        - <<: *base_container
          name: api
          ports:
            - containerPort: 8080
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 20
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-worker
spec:
  replicas: 2
  template:
    spec:
      containers:
        - <<: *base_container
          name: worker
          command: ["python", "-m", "celery.worker"]
          # Resources from anchor are inherited; overrides below:
          resources:
            requests:
              memory: "256Mi"
              cpu: "200m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
```

### Pattern 3: Helm Values Inheritance with Anchors and Merge Keys

```yaml
# values.yaml — demonstrate anchor usage in Helm charts
base_ingress: &base_ingress
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
  tls:
    - secretName: app-tls
      hosts:
        - example.com
  rules:
    - host: example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api
                port:
                  number: 80

# Environment-specific overrides via merge key
staging:
  ingress:
    <<: *base_ingress
    annotations:
      # Override annotation only — other keys inherited from anchor
      nginx.ingress.kubernetes.io/ssl-redirect: "false"
    rules:
      - host: staging.example.com

production:
  ingress:
    <<: *base_ingress
    tls:
      - secretName: prod-tls
        hosts:
          - example.com
          - api.example.com
```

---

## Constraints

### MUST DO
- Use descriptive anchor names that reflect the content they contain (`&base_service_config`, not `&x`, `&1`, or `&temp`)
- Test YAML files with both PyYAML >= 6.0 and ruamel.yaml before committing to CI/CD pipelines to catch parser differences
- Place anchors at a logical document level — define them where they make semantic sense, typically near the top of the file
- Document complex multi-anchor merge chains with inline comments explaining which anchor each service inherits from and what it overrides

### MUST NOT DO
- Reuse the same anchor name (`&defaults`) in the same file — it silently overwrites previous definitions without warning
- Expect merge keys (`<<:`) to deep-merge nested objects — they perform shallow merge only; entire nested mappings are fully replaced by child keys of the same name
- Anchor inside a sequence item and expect to reference just that item — anchoring on a list anchors the entire list node
- Use `&anchor` and `*alias` in YAML 1.0 parsers where merge key behavior is undefined

---

## Common Pitfalls

### Circular References
```yaml
# ❌ CRASHES — YAML parser detects circular reference and raises an error
circular_a: &a
  self_ref: *a              # Fatal error: recursive mapping definition detected

parent: &parent_config
  children_count: 3
  child_names: [alice, bob, charlie]
# ✅ GOOD — Always verify no anchor references itself or creates a cycle
```

### Shallow Merge Replaces Nested Objects
```yaml
# ❌ BAD — "format" key is silently lost because the entire logging mapping is replaced
defaults: &defaults
  logging:
    level: info
    format: json

app_config:
  <<: *defaults
  logging:
    level: debug          # ⚠️ "format: json" is completely lost!
                          # The parser replaces the whole 'logging' mapping

# ✅ GOOD — Re-anchor the nested object for targeted deep override
defaults: &defaults
  logging:
    level: info
    format: json

logging_debug_override: &logging_debug
  <<: *defaults.logging   # re-anchor only the nested mapping
  level: debug            # now only "level" is overridden, "format" preserved

app_config:
  <<: *defaults
  logging: *logging_debug
```

### Scalar Anchor Misuse
```yaml
# ❌ BAD — Anchoring a scalar value does NOT perform string interpolation
_port_value: &api_port 8080

services:
  web:
    ports:
      - "*api_port:80"       # ⚠️ This is a literal string "*api_port:80", not expanded!
                             # Anchors on scalars replace the ENTIRE node, not substrings

# ✅ GOOD — Use environment variables for values that need interpolation in strings
environment:
  API_PORT: "8080"

services:
  web:
    ports:
      - "${API_PORT}:80"     # Docker Compose resolves this correctly
```

---

## Output Template

When implementing YAML anchor patterns, produce:

1. **Identified anchors** — List each duplicative block found and its proposed anchor name with justification
2. **Anchor definitions** — Show the full `&anchorName` definition including every key-value pair being reused
3. **Alias/merge usage** — Show each `*anchorName` or `<<: *anchorName` reference with its override keys clearly commented
4. **Override documentation** — For each child config, document what differs from the anchor and why
5. **Parser validation results** — Confirm the file loads correctly under both PyYAML 6.0+ and ruamel.yaml, noting any version-specific differences

---

## Live References

> Authoritative documentation for YAML anchoring and merging patterns.

- [YAML Spec 1.2.2 — Anchors and Aliases](https://yaml.org/spec/1.2.2/#73-alias-nodes)
- [YAML Spec — Merge Keys (Legacy Type)](https://yaml.org/type/merge.html)
- [PyYAML Documentation](https://pyyaml.org/wiki/PyYAMLDocumentation)
- [ruamel.yaml Documentation](https://sourceforge.net/p/ruamel-yaml/wiki/Home/)
- [Docker Compose File Specification v3.9](https://docs.docker.com/compose/compose-file/compose-file-v3/)
- [Kubernetes YAML Best Practices for Configuration](https://kubernetes.io/docs/concepts/configuration/organize-cluster-access-kubeconfig/)
- [Helm Values Files and Inheritance](https://helm.sh/docs/chart_best_practices/values/)
