---
name: helm-chart-development
description: Builds, templates, and manages Helm charts with Chart.yaml, values.yaml, and Go template files for reliable Kubernetes application deployment and versioned releases.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: cncf
  role: implementation
  scope: implementation
  output-format: code
  triggers: helm chart development, helm templating, helm values, helm debugging, chartmuseum, helm registry, helm lint, chart.yaml
  archetypes:
    - tactical
    - generation
  anti_triggers:
    - kustomize overlays
    - argo cd workflows
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
  related-skills: cncf-kubernetes, coding-kubernetes-deployments-management, cncf-prometheus
---

# Helm Chart Development

Implements the full lifecycle of Helm chart creation, templating, packaging, and distribution — from initial `helm create` scaffolding through production-ready chart releases on a registry or ChartMuseum.

## TL;DR Checklist

- [ ] `Chart.yaml` declares `apiVersion: v2`, a stable `version`, and `appVersion`
- [ ] `values.yaml` provides sensible defaults and documents every field with comments
- [ ] Templates use `{{-` / `-}}` whitespace control to avoid blank lines in rendered YAML
- [ ] `{{ include }}` helpers keep repeated logic DRY and namespaced per release
- [ ] `helm lint <chart-dir>` passes before any commit
- [ ] `helm template .` renders cleanly with default and overridden values
- [ ] `helm package <chart-dir>` produces a tarball with correct semantic version
- [ ] Chart is pushed to a registry or ChartMuseum with `helm push` or `helm push chart.tgz chartmuseum://...`

---

## When to Use

Use this skill when:

- You are authoring a new Helm chart from scratch or converting an existing deployment to a chart
- You need to parameterize a Kubernetes manifest so teams can install it with custom values
- You are debugging a chart that renders incorrectly or fails `helm lint`
- You are packaging and distributing a chart to a Helm registry or ChartMuseum for team use
- You need to create reusable template helpers (labels, ingress, service) across multiple template files

---

## When NOT to Use

Avoid this skill for:

- Pure Kustomize overlay management — use Kustomize-native tooling instead
- Argo CD application-of-application workflows — Helm is for packaging, Argo CD is for GitOps sync
- Generating one-off manifests for non-Helm users — output pure YAML directly instead
- Managing cluster-wide operators with multi-chart dependencies — use `helm install` with proper `requirements.yaml`/`dependencies` in Chart.yaml

---

## Core Workflow

### Phase 1: Scaffolding and Structure

1. **Create the chart scaffold** — Run `helm create <chart-name>` in an empty directory. This generates `Chart.yaml`, `values.yaml`, and `templates/` with a starter `deployment.yaml`, `service.yaml`, and `helpers.tpl`.

2. **Audit the scaffold** — Read every generated file. The scaffold is intentionally generic: update `Chart.yaml` metadata, remove files you do not need (e.g., `ingress.yaml` if the app has no ingress), and rename files to match your application's resources.

3. **Define the directory layout** — A production chart follows this structure:
   ```
   my-chart/
   ├── Chart.yaml            # Chart metadata
   ├── values.yaml           # Default values
   ├── values.schema.json    # Optional JSON Schema validation
   ├── templates/
   │   ├── _helpers.tpl      # Reusable named templates
   │   ├── deployment.yaml
   │   ├── service.yaml
   │   └── NOTES.txt
   └── .helmignore           # Files to exclude from packaging
   ```

   **Checkpoint:** Run `helm lint my-chart/` and verify it reports no errors or only warnings you have intentionally accepted.

### Phase 2: Chart.yaml and Values

4. **Write Chart.yaml** — Use `apiVersion: v2` for modern Helm charts. Set `version` to a semantic version (e.g., `1.2.0`) and `appVersion` to the application's version string:
   ```yaml
   apiVersion: v2
   name: my-chart
   description: A Helm chart for deploying my application
   type: application
   version: 1.2.0
   appVersion: "3.1.0"
   keywords:
     - web
     - app
   maintainers:
     - name: Platform Team
       email: platform@example.com
   ```

   **Checkpoint:** Confirm `version` is valid semver and `appVersion` is quoted if it contains non-numeric characters.

5. **Write values.yaml** — Provide defaults for every configurable aspect of your chart. Every top-level key in `values.yaml` is overridable at install time via `--set` or `--values`. Comment each section to document its purpose:
   ```yaml
   # Replicas for the deployment
   replicaCount: 2

   # Container image configuration
   image:
     repository: myregistry/my-app
     pullPolicy: IfNotPresent
     # Override the image tag explicitly
     tag: ""

   # Service exposure
   service:
     type: ClusterIP
     port: 80
     targetPort: 8080

   # Resource limits and requests
   resources:
     limits:
       cpu: 500m
       memory: 512Mi
     requests:
       cpu: 250m
       memory: 256Mi

   # Autoscaling configuration (disabled by default)
   autoscaling:
     enabled: false
     minReplicas: 3
     maxReplicas: 10
     targetCPUUtilizationPercentage: 80
   ```

   **Checkpoint:** Run `helm template my-chart/ --set replicaCount=5` and verify the rendered output reflects the override.

### Phase 3: Templating

6. **Implement _helpers.tpl** — Define named templates for labels, selectors, and any repeated patterns. Use the chart's fullname to namespace helper output:
   ```
   {{/*
   Generate basic labels including app.kubernetes.io/version.
   */}}
   {{- define "my-chart.labels" -}}
   include "my-chart.selectorLabels" .
   app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
   app.kubernetes.io/managed-by: {{ .Release.Service }}
   {{- end }}

   {{/*
   Selector labels used by Deployments and Services.
   */}}
   {{- define "my-chart.selectorLabels" -}}
   app.kubernetes.io/name: {{ .Chart.Name }}
   app.kubernetes.io/instance: {{ .Release.Name }}
   {{- end }}
   ```

7. **Write resource templates** — In `templates/deployment.yaml`, reference values and helpers:
   ```yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: {{ include "my-chart.fullname" . }}
     labels:
       {{- include "my-chart.labels" . | nindent 4 }}
   spec:
     {{- if not .Values.autoscaling.enabled }}
     replicas: {{ .Values.replicaCount }}
     {{- end }}
     selector:
       matchLabels:
         {{- include "my-chart.selectorLabels" . | nindent 8 }}
     template:
       metadata:
         labels:
           {{- include "my-chart.selectorLabels" . | nindent 10 }}
       spec:
         containers:
           - name: {{ .Chart.Name }}
             image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
             imagePullPolicy: {{ .Values.image.pullPolicy }}
             ports:
               - name: http
                 containerPort: {{ .Values.service.targetPort }}
                 protocol: TCP
             livenessProbe:
               httpGet:
                 path: /healthz
                 port: http
             readinessProbe:
               httpGet:
                 path: /ready
                 port: http
             resources:
               {{- toYaml .Values.resources | nindent 12 }}
   ```

8. **Handle conditional blocks** — Use `if/else` for optional features (ingress, HPA, secrets) and `range` for lists:
   ```yaml
   {{- if .Values.ingress.enabled }}
   apiVersion: networking.k8s.io/v1
   kind: Ingress
   metadata:
     name: {{ include "my-chart.fullname" . }}
   spec:
     rules:
       {{- range .Values.ingress.hosts }}
       - host: {{ .host | quote }}
         http:
           paths:
             {{- range .paths }}
             - path: {{ .path }}
               pathType: {{ .pathType }}
               backend:
                 service:
                   name: {{ include "my-chart.fullname" $ }}
                   port:
                     number: {{ $.Values.service.port }}
             {{- end }}
       {{- end }}
   {{- end }}
   ```

   **Checkpoint:** Run `helm template my-chart/ -f custom-values.yaml` with at least two different value sets and verify both render correctly.

### Phase 4: Validation, Packaging, and Distribution

9. **Validate the chart** — Run the full validation suite:
   ```bash
   # Lint for structural issues
   helm lint my-chart/

   # Lint with strict mode (catches warnings as errors)
   helm lint --strict my-chart/

   # Render with default values
   helm template my-chart/

   # Render with custom overrides
   helm template my-chart/ --set replicaCount=3 --set image.tag=v2.0.0

   # Install in dry-run mode (no actual cluster interaction)
   helm install --dry-run --debug my-release my-chart/
   ```

10. **Package the chart** — Create a versioned tarball for distribution:
    ```bash
    helm package my-chart/
    # Produces: my-chart-1.2.0.tgz
    ```

11. **Push to a registry or ChartMuseum** — Distribute the packaged chart:
    ```bash
    # Push to a Helm OCI registry
    helm push my-chart-1.2.0.tgz oci://registry.example.com/charts

    # Push to a ChartMuseum instance
    helm push my-chart-1.2.0.tgz chartmuseum://http://chartmuseum.internal

    # Or upload manually
    curl --data-binary @"my-chart-1.2.0.tgz" http://chartmuseum.internal/api/charts
    ```

    **Checkpoint:** Install the packaged chart in a test cluster using `helm install test-release ./my-chart-1.2.0.tgz` and verify all resources are healthy.

---

## Implementation Patterns

### Pattern 1: Standard Deployment with Resource Management

This is the baseline deployment pattern for stateless workloads. It includes readiness/liveness probes, resource requests/limits, and proper label inheritance from helpers.

**deployment.yaml**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "my-chart.fullname" . }}
  labels:
    {{- include "my-chart.labels" . | nindent 4 }}
  {{- with .Values.annotations }}
  annotations:
    {{- toYaml . | nindent 4 }}
  {{- end }}
spec:
  {{- if not .Values.autoscaling.enabled }}
  replicas: {{ .Values.replicaCount }}
  {{- end }}
  strategy:
    {{- toYaml .Values.strategy | nindent 4 }}
  selector:
    matchLabels:
      {{- include "my-chart.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "my-chart.selectorLabels" . | nindent 8 }}
      {{- with .Values.podAnnotations }}
      annotations:
        {{- toYaml . | nindent 8 }}
      {{- end }}
    spec:
      serviceAccountName: {{ include "my-chart.serviceAccountName" . }}
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - name: http
              containerPort: {{ .Values.service.targetPort }}
              protocol: TCP
          livenessProbe:
            httpGet:
              path: /healthz
              port: http
            initialDelaySeconds: 15
            periodSeconds: 20
          readinessProbe:
            httpGet:
              path: /ready
              port: http
            initialDelaySeconds: 5
            periodSeconds: 10
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
          env:
            {{- range $key, $value := .Values.env }}
            - name: {{ $key }}
              value: {{ $value | quote }}
            {{- end }}
      {{- with .Values.nodeSelector }}
      nodeSelector:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .Values.affinity }}
      affinity:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .Values.tolerations }}
      tolerations:
        {{- toYaml . | nindent 8 }}
      {{- end }}
```

**values.yaml (deployment-related section)**
```yaml
replicaCount: 2

image:
  repository: myregistry/my-app
  pullPolicy: IfNotPresent
  tag: ""

strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1
    maxUnavailable: 0

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 250m
    memory: 256Mi

env:
  APP_ENV: production
  LOG_LEVEL: info

nodeSelector: {}

tolerations: []

affinity: {}

autoscaling:
  enabled: false
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80
```

### Pattern 2: Service Discovery with Headless and ClusterIP Services

This pattern covers two service types in one chart: a standard ClusterIP for internal communication and an optional headless service for direct pod addressing (useful for stateful apps or service meshes).

**service.yaml**
```yaml
{{- if .Values.service.enabled }}
apiVersion: v1
kind: Service
metadata:
  name: {{ include "my-chart.fullname" . }}
  labels:
    {{- include "my-chart.labels" . | nindent 4 }}
spec:
  type: {{ .Values.service.type }}
  ports:
    - port: {{ .Values.service.port }}
      targetPort: http
      protocol: TCP
      name: http
  selector:
    {{- include "my-chart.selectorLabels" . | nindent 4 }}
{{- end }}

{{- if .Values.headlessService.enabled }}
---
apiVersion: v1
kind: Service
metadata:
  name: {{ include "my-chart.fullname" . }}-headless
  labels:
    {{- include "my-chart.labels" . | nindent 4 }}
spec:
  type: ClusterIP
  clusterIP: None
  ports:
    - port: {{ .Values.service.port }}
      targetPort: http
      protocol: TCP
      name: http
  selector:
    {{- include "my-chart.selectorLabels" . | nindent 4 }}
{{- end }}
```

**values.yaml (service-related section)**
```yaml
service:
  enabled: true
  type: ClusterIP
  port: 80
  targetPort: 8080

headlessService:
  enabled: false
```

### Pattern 3: HorizontalPodAutoscaler with Custom Metrics

Use this pattern when the application scales based on CPU, memory, or custom metrics (e.g., queue depth).

**hpa.yaml**
```yaml
{{- if .Values.autoscaling.enabled }}
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: {{ include "my-chart.fullname" . }}
  labels:
    {{- include "my-chart.labels" . | nindent 4 }}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: {{ include "my-chart.fullname" . }}
  minReplicas: {{ .Values.autoscaling.minReplicas }}
  maxReplicas: {{ .Values.autoscaling.maxReplicas }}
  metrics:
    {{- if .Values.autoscaling.targetCPUUtilizationPercentage }}
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: {{ .Values.autoscaling.targetCPUUtilizationPercentage }}
    {{- end }}
    {{- if .Values.autoscaling.targetMemoryUtilizationPercentage }}
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: {{ .Values.autoscaling.targetMemoryUtilizationPercentage }}
    {{- end }}
    {{- if .Values.autoscaling.customMetrics }}
    {{- range .Values.autoscaling.customMetrics }}
    - type: Object
      object:
        metric:
          name: {{ .metricName }}
        identifiedBy:
          {{- range .identifiers }}
          - key: {{ .key }}
            value: {{ .value }}
          {{- end }}
        target:
          type: Value
          value: {{ .targetValue }}
    {{- end }}
    {{- end }}
{{- end }}
```

### Pattern 4: ConfigMap and Secret as Environment Sources

This pattern externalizes configuration into ConfigMaps and secrets, keeping sensitive data out of deployment manifests.

**configmap.yaml**
```yaml
{{- if .Values.configMap.enabled }}
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "my-chart.fullname" . }}-config
  labels:
    {{- include "my-chart.labels" . | nindent 4 }}
data:
  {{- range $key, $value := .Values.configMap.data }}
  {{ $key }}: {{ $value | quote }}
  {{- end }}
{{- end }}
```

**secrets.yaml**
```yaml
{{- if .Values.secrets.create }}
apiVersion: v1
kind: Secret
metadata:
  name: {{ include "my-chart.fullname" . }}-secrets
  labels:
    {{- include "my-chart.labels" . | nindent 4 }}
type: Opaque
data:
  {{- range $key, $value := .Values.secrets.data }}
  {{ $key }}: {{ $value | b64enc }}
  {{- end }}
{{- end }}
```

---

## Constraints

### MUST DO

- Always use `apiVersion: v2` in Chart.yaml for modern Helm charts (supports dependencies without requirements.yaml).
- Prefix all named templates in `_helpers.tpl` with the chart name to avoid collisions across releases (e.g., `my-chart.labels`).
- Use `{{-` (dash-open) to strip leading whitespace and `-}}` (close-dash) to strip trailing whitespace in template conditionals.
- Use `nindent` when embedding block output (like `include` results) inside YAML to maintain correct indentation levels.
- Provide `resources` with both requests and limits — omitting requests prevents the scheduler from making correct decisions.
- Use `.Values.image.tag | default .Chart.AppVersion` so that untagged installs fall back to the app version rather than `latest`.
- Validate every chart with `helm lint --strict` and `helm template` before committing template changes.
- Document every configurable key in `values.yaml` with a comment explaining its purpose and acceptable range.
- Use `---` YAML document separators only when multiple top-level resources are in one template file.
- Test charts with `helm test <release-name>` if you define test hooks in `templates/tests/`.

### MUST NOT DO

- Never hardcode namespace names in templates — use `{{ .Release.Namespace }}` so the chart can be installed into any namespace.
- Do not use `.Values` keys that shadow Helm built-in objects (e.g., avoid a key named `Capabilities` or `Release`).
- Never embed base64-encoded secrets directly in `values.yaml` — use a Secret resource or an external secret manager (Sealed Secrets, External Secrets Operator).
- Do not skip `helm lint` before packaging — a chart that fails lint will produce silent rendering errors in production.
- Never use `.Values` without the `.Values.` prefix — bare variable names resolve to Go template variables, not Helm values, causing nil pointer errors.
- Do not put `Chart.yaml` or `values.yaml` inside the `templates/` directory — Helm only processes `.yaml` and `.tpl` files in `templates/` during rendering.
- Never use `helm upgrade --install` with `--force` in production scripts — it tears down and recreates resources, which can cause data loss for stateful workloads.
- Do not use deprecated APIs (e.g., `extensions/v1beta1` for Deployments or `networking.k8s.io/v1beta1` for Ingress) in templates.

---

## Output Template

When this skill is active, the model's output must contain:

1. **Chart Structure** — The directory layout with file paths and brief descriptions of each file's role.
2. **Chart.yaml** — Complete, valid YAML with all required fields and sensible metadata.
3. **values.yaml** — Full defaults file with documented sections, typed keys, and commented explanations.
4. **Template Files** — Complete, renderable Go template code with helper references, proper indentation, and conditional blocks.
5. **Validation Commands** — Exact `helm lint`, `helm template`, and `helm install --dry-run` commands to verify the chart before distribution.
6. **Packaging Instructions** — The `helm package` command and the appropriate push/install command for the target registry.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `cncf-kubernetes` | Cluster fundamentals, namespaces, and resource types referenced in charts |
| `coding-kubernetes-deployments-management` | Advanced deployment strategies (canary, blue-green) that charts may implement |
| `cncf-prometheus` | ServiceMonitor and Prometheus annotations that charts can inject for observability |

---

## Live References

- **Helm Documentation** — https://helm.sh/docs/
- **Helm Chart Best Practices** — https://helm.sh/docs/chart_best_practices/
- **Helm Template Function Reference** — https://helm.sh/docs/chart_template_guide/function_list/
- **Kubernetes JSON Schema for Helm** — https://github.com/kubernetes/community/blob/master/contribators/deprecation/118-deprecation-capabilities-api.md
- **Helm OCI Registry Support** — https://helm.sh/docs/topics/registries/
- **ChartMuseum** — https://github.com/helm/chartmuseum
- **Helm Lint Reference** — https://helm.sh/docs/helm/helm_lint/
