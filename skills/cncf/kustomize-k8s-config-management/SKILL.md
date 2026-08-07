---
name: kustomize-k8s-config-management
description: Implements Kubernetes configuration management with Kustomize bases, overlays, strategic/JSON patches, and generators for environment-specific deployment customization.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: cncf
  triggers: kustomize, kustomization.yaml, overlay patches, kubernetes customization, kustomize generators, k8s config management, json patches, strategic merge
  role: implementation
  scope: implementation
  output-format: code
  archetypes:
    - tactical
    - diagnostic
  anti_triggers:
    - helm chart development
    - manual yaml editing
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: cncf-kubernetes, cncf-helm, cncf-argo-cd
---

# Kubernetes Configuration Management with Kustomize

Implements environment-specific Kubernetes configurations using Kustomize bases, overlays, strategic merge patches, and JSON patches. Manages deployment customization for dev, staging, and production without duplicating YAML manifests.

## TL;DR Checklist

- [ ] Create a base `kustomization.yaml` with `resources`, `commonLabels`, and `commonAnnotations`
- [ ] Build at least one overlay directory (e.g., `overlays/production/`) with patches and env-specific values
- [ ] Verify patches target the correct `kind`, `name`, and `path` fields
- [ ] Test with `kustomize build <overlay-dir>` before applying to any cluster
- [ ] Use `patchesStrategicMerge` for structural changes and `patchesJson6902` for precise field edits
- [ ] Store image tags and replica counts in overlay `kustomization.yaml` using `images` and `replicas` directives
- [ ] Keep the base cluster-neutral — no namespace, node selectors, or resource limits tied to an environment

---

## When to Use

Use this skill when:

- Managing Kubernetes configurations across multiple environments (dev, staging, production) without YAML duplication
- Customizing a shared set of deployments, services, and configmaps per environment using overlays
- Replacing or supplementing Helm with a Git-native, Kubernetes-native config management approach
- Applying selective patches (replicas, resources, env vars, labels) to specific resources in an overlay
- Building infrastructure-as-code pipelines with CI/CD (e.g., Argo CD, Flux) that consume `kustomize build` output

---

## When NOT to Use

Avoid this skill for:

- Package management with versioning and dependency resolution — use `helm chart development` or ArgoCD Application CRDs instead
- Highly templated configurations with complex conditional logic — consider Helm charts or KubeVault
- Small single-environment clusters where raw YAML manifests are simpler
- Manual per-file YAML editing — use `kustomize build` for deterministic output

---

## Core Workflow

1. **Define the Base Layer** — Create a base directory containing all shared Kubernetes manifests and a `kustomization.yaml` that declares them with `resources:`. Add `commonLabels` and `commonAnnotations` that apply to every resource. **Checkpoint:** Run `kustomize build ./base` — all resources should render without errors and carry the common labels.

2. **Create Environment Overlay Directories** — Under `overlays/<env>/` (e.g., `overlays/production/`), create a `kustomization.yaml` that references the base via `bases:` or `resources:` and declares overlay-specific customizations. **Checkpoint:** Each overlay must have a `namespace:` declaration and environment-specific image/replica overrides.

3. **Apply Patches** — Use one of these patch strategies per overlay:
   - `patchesStrategicMerge:` — List patch files that fully or partially overwrite resources
   - `patches:` (inline) — YAML inline patches in the overlay's `kustomization.yaml`
   - `patchesJson6902:` — JSON Patch (RFC 6902) targeting specific fields with `target:` selectors
   **Checkpoint:** Every patch must target a valid `kind: <resource-kind>` and `name: <resource-name>` that exists in the base.

4. **Customize Images, Replicas, and ConfigMaps** — Declare image overrides with `images:` (e.g., `name: myapp, newTag: v2.1.0`), replica scaling with `replicas:`, and ConfigMap key overrides with `configMapGenerator:`. **Checkpoint:** Run `kustomize build ./overlays/production` and grep for `replicas: 3` and the correct image tag to confirm overrides.

5. **Validate and Deploy** — Run `kustomize build <overlay-dir> > /dev/null` to validate, then pipe output to `kubectl apply` or hand off to a GitOps controller. **Checkpoint:** Diff the rendered output against the previous deployment to confirm only intended fields changed.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Base + Overlay Directory Structure

Standard Kustomize project layout separates shared resources from environment-specific customizations:

```
my-kustomize-project/
├── base/
│   ├── kustomization.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   └── configmap.yaml
├── overlays/
│   ├── dev/
│   │   ├── kustomization.yaml
│   │   └── replica-patch.yaml
│   ├── staging/
│   │   ├── kustomization.yaml
│   │   └── replica-patch.yaml
│   └── production/
│       ├── kustomization.yaml
│       ├── resource-patch.yaml
│       ├── replica-patch.yaml
│       └── config-patch.yaml
```

**Base `kustomization.yaml`:**

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - deployment.yaml
  - service.yaml
  - configmap.yaml

commonLabels:
  app: my-service
  managed-by: kustomize

commonAnnotations:
  kustomize.tool.gitops.myorg.io/repo: my-kustomize-project
  kustomize.tool.gitops.myorg.io/base: base
```

**Production overlay `kustomization.yaml`:**

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: production

resources:
  - ../../base

images:
  - name: myregistry/my-service
    newTag: "2.1.0"
    newValue: "2.1.0"

replicas:
  - name: my-service-deployment
    count: 5

patches:
  - path: replica-patch.yaml
  - path: resource-patch.yaml
  - path: config-patch.yaml
```

### Pattern 2: Strategic Merge Patch vs JSON 6902 Patch

Use strategic merge patches for structural changes (adding new fields, updating nested objects) and JSON 6902 patches for precise field-level edits without overwriting the entire resource.

```yaml
# ❌ BAD: Overwriting the entire deployment spec loses any fields
# not present in the patch file, making future base changes fragile
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service-deployment
spec:
  template:
    spec:
      containers:
        - name: my-service
          image: myregistry/my-service:2.1.0
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: "500m"
              memory: "512Mi"
            limits:
              cpu: "1000m"
              memory: "1Gi"

# ✅ GOOD: Strategic merge patch — only adds/overwrites the fields
# specified; the rest of the resource is inherited from base
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service-deployment
spec:
  template:
    spec:
      containers:
        - name: my-service
          resources:
            requests:
              cpu: "250m"
              memory: "256Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          env:
            - name: LOG_LEVEL
              value: "info"
            - name: ENVIRONMENT
              value: "production"
```

**JSON 6902 Patch (targeted field edit):**

```yaml
# overlays/production/config-patch.yaml
apiVersion: kustomize.config.k8s.io/v1alpha1
kind: Patch
op: replace
path: /spec/template/spec/containers/0/env/2/value
value: "critical-path"
target:
  kind: Deployment
  name: my-service-deployment
  apiVersion: apps/v1
  namespace: production
```

### Pattern 3: ConfigMap Generator in Overlay

Generate or override ConfigMap entries per environment without modifying the base manifest:

```yaml
# overlays/dev/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: dev

resources:
  - ../../base

configMapGenerator:
  - name: my-service-config
    literals:
      - DATABASE_HOST=localhost
      - DATABASE_PORT=5432
      - CACHE_TTL=60
      - FEATURE_FLAGS=debug-mode=true
    options:
      disableNameSuffixHash: "false"

configurations:
  - kustomizeconfig.yaml
```

```yaml
# overlays/dev/kustomizeconfig.yaml
# Field generators: replace values in existing ConfigMap keys
nameReference:
  - kind: ConfigMap
    fieldSpecs:
      - kind: Deployment
        path: spec/template/spec/volumes/0/configMap/name

name:
  - kind: ConfigMap
    path: spec/template/spec/volumes/0/configMap/name
```

### Pattern 4: Variable Substitution with kustomize edit

Use `kustomize edit` for automated overlay customization from scripts or CI pipelines:

```bash
# Add an image override programmatically
kustomize edit set image myregistry/my-service:v3.0.0

# Add an env var to a ConfigMap generator
kustomize edit set configmap my-service-config --from-literal=FEATURE_FLAGS=dark-mode=true

# Set replicas
kustomize edit add patch --kind Deployment --name my-service-deployment \
  --patch '[{"op":"replace","path":"/spec/replicas","value":10}]'

# Add a label to all resources
kustomize edit add label release-cycle=2026-w32

# Verify the result
kustomize build ./overlays/production
```

### Pattern 5: Patch Order and Merging

Kustomize applies patches in declaration order. The last patch wins for conflicting fields. Understand this for debugging unexpected output:

```
Rendered base resource
       ↓
patchesStrategicMerge (applied in order listed)
       ↓
patches (inline, applied in order listed)
       ↓
patchesJson6902 (applied in order listed)
       ↓
final rendered output
```

```yaml
# overlays/staging/kustomization.yaml
# Patches applied in this exact order:
patches:
  # 1st: Set resource limits (strategic merge)
  - path: limits-patch.yaml
  # 2nd: Override specific env vars (JSON 6902)
  - path: env-override.yaml
  # 3rd: Add node affinity (strategic merge) — may conflict with limits-patch
  - path: affinity-patch.yaml

# If limits-patch.yaml and affinity-patch.yaml both set spec.template.spec.containers,
# the affinity-patch wins because it appears last.
# Use `kustomize build ./overlays/staging` to inspect the merge result.
```

---

## Constraints

### MUST DO

- Always run `kustomize build <overlay-dir> > /dev/null` to validate rendering before applying to any cluster
- Use `commonLabels` in the base for all resources that need consistent labeling (e.g., `app.kubernetes.io/managed-by: kustomize`)
- Declare overlays with explicit `namespace:` — never rely on the default namespace in production overlays
- Use `images:` directive for image tag overrides instead of patching the container image field
- Use `configMapGenerator:` for environment-specific ConfigMap data rather than maintaining separate files
- Place patches in the overlay directory, never in the base — bases must remain cluster- and environment-agnostic
- Use `patchesJson6902` with explicit `target:` selectors when you need field-level precision within a resource
- Pin image names in `images:` with the full registry path (e.g., `myregistry/my-service`) to avoid ambiguous references
- When using `replicas:`, reference the deployment by the exact `name` from the base `kustomization.yaml`

### MUST NOT DO

- Never modify base manifests for environment-specific values — this defeats the overlay model entirely
- Never apply overlays with `namespace: default` to production configurations
- Never use `patchesStrategicMerge` to overwrite an entire Deployment spec — use targeted strategic merge or JSON 6902 instead
- Never rely on `nameSuffixHash` for production — use `disableNameSuffixHash: "true"` when you need stable resource names
- Never mix Helm values files with Kustomize patches in the same pipeline — pick one config management strategy
- Never use `kubectl apply -k` with user-editable overlay directories as CI input — always validate with `kustomize build` first
- Never skip the `patches` order review — patch application order determines final rendered output and is a common source of bugs
- Never hardcode cluster endpoints or credential references in base or overlay manifests — use external secret management

---

## Troubleshooting Common Issues

| Symptom | Likely Cause | Fix |
|---|---|---|
| `build` fails with `no matches for kind Deployment` | Target selector in JSON 6902 patch references wrong `kind` | Verify `kind: Deployment` and `name:` match a resource in the base |
| Patch has no visible effect | Patch declared after a later patch overwrites the same field | Reorder `patches:` so your patch applies last, or use JSON 6902 for precision |
| `image:` override not applied | Image name in `images:` doesn't match the container `image:` in base | Use `kustomize build` and grep for `image:` to confirm the rendered value |
| ConfigMap name mismatch after generation | Default name suffix is appended (e.g., `config-abc123`) | Set `options.disableNameSuffixHash: "false"` to retain the declared name |
| Replicas not changing | `replicas:` count name doesn't match deployment name in base | Check `kustomization.yaml` `resources:` for the declared base name |

---

## Related Skills

| Skill | Purpose |
|---|---|
| `cncf-kubernetes` | Core Kubernetes concepts, resources, and API patterns — prerequisite for understanding Kustomize targets |
| `cncf-helm` | Alternative configuration management with templating and package management — choose Kustomize or Helm, not both |
| `cncf-argo-cd` | GitOps controller that natively supports `kustomize build` as a source type for continuous deployment |

---

## Live References

> Authoritative documentation links for Kustomize configuration management.

- [Kustomize Official Documentation](https://kustomize.io/)
- [Kustomize API Reference](https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/)
- [Kustomize Configuration File Format](https://github.com/kubernetes-sigs/kustomize/blob/master/api/kustomization/Kustomization.v1beta1.md)
- [Kubernetes Kustomize on kubectl](https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/)
- [Kustomize JSON 6902 Patch Documentation](https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/patchesjson6902/)
- [Kustomize Overlays and Patches Guide](https://kubectl.docs.kubernetes.io/guides/kustomizeworkflow/)
- [Kustomize Config Map Generator](https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/configmapgenerator/)
