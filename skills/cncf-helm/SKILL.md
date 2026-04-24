---
name: cncf-helm
description: Helm in Cloud-Native Engineering - The Kubernetes Package Manager
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: cncf
  role: reference
  scope: infrastructure
  output-format: manifests
  triggers: cloud-native, container orchestration, engineering, helm, k8s, k8s charts,
    kubernetes package manager, kubernetes
---



# Helm in Cloud-Native Engineering

**Category:** chart  
**Status:** Active  
**Stars:** 29,714  
**Last Updated:** 2026-04-21  
**Primary Language:** Go  
**Documentation:** [https://helm.sh/docs/](https://helm.sh/docs/)  

---

## Purpose and Use Cases

Helm is a core component of the cloud-native ecosystem, serving as a Kubernetes package manager that simplifies deployment and management of applications on Kubernetes clusters.

### What Problem Does It Solve?

The complexity of deploying multi-component applications to Kubernetes, including managing multiple YAML files, versioning, and maintaining application state.

### When to Use This Project

Use Helm when deploying multi-component applications to Kubernetes, managing application versioning, or when you want to share Kubernetes manifests as reusable charts.

### Key Use Cases


- Multi-component application deployment
- Application versioning and rollback
- Chart templating for reusable configurations
- Release management and history tracking
- Shared chart repositories


---

## Architecture Design Patterns

### Core Components


- **Helm Client**: CLI for chart operations
- **Chart**: Package containing Kubernetes manifests
- **Repository**: Storage for chart packages
- **Release**: Instance of a chart deployed to Kubernetes
- **Tiller** (deprecated in Helm 3): Server-side component (removed in v3)
- **Hooks**: Lifecycle events for chart operations


### Component Interactions


1. **Helm Client → Chart Repository**: Pulls chart
2. **Helm Client → API Server**: Deploys release
3. **Tiller** (v2): Manages release state
4. **Release → Kubernetes**: Applies manifests
5. **Helm → API Server**: Manages release history


### Data Flow Patterns


1. **Chart Installation**: Chart fetch → Template rendering → Manifest generation → API Server → Release storage
2. **Rollback**: Release state → Previous manifest → API Server → New release
3. **Dependency Resolution**: Chart.yaml → dependency list → Chart file → Repository fetch


### Design Principles


- **Template-Based**: Go templating for dynamic manifests
- **Versioned Charts**: Chart and app versioning
- **Release Management**: Track and manage deployments
- **Reusable Charts**: Share and reuse configurations
- **Hooks**: Lifecycle event support


---

## Integration Approaches

### Integration with Other CNCF Projects


- **Kubernetes**: Primary platform for deployment
- **Prometheus**: Helm operator for GitOps
- **Argo CD**: GitOps integration
- ** tekton**: CI/CD pipeline deployment


### API Patterns


- **Git Protocol**: Chart repository access
- **HTTP/HTTPS**: Chart repository API
- **Kubernetes API**: Release management
- **Plugin API**: CLI extensions


### Configuration Patterns


- **values.yaml**: Default values
- **--set**: Command-line overrides
- **Chart.yaml**: Chart metadata
- **values.schema.json**: Validation schema


### Extension Mechanisms


- **Hooks**: Lifecycle events
- **Charts**: Reusable packages
- **Plugins**: CLI extensions
- **Templates**: Custom logic with Sprig


---

## Common Pitfalls and How to Avoid Them

### Misconfigurations


- **Template Syntax**: Incorrect Go template syntax
- **Values File**: Missing or incorrect values
- **Chart Dependencies**: Not updating dependencies
- **Release Name**: Duplicate release names
- **Namespace**: Incorrect namespace in templates


### Performance Issues


- **Template Rendering**: Complex templates
- **Chart Resolution**: Slow repository access
- **API Server Load**: Large manifest applications


### Operational Challenges


- **Chart Maintenance**: Keeping charts up to date
- **Release Management**: Managing release history
- **Dependency Resolution**: Complex dependencies
- **Template Debugging**: Template rendering issues


### Security Pitfalls


- **Chart Security**: Untrusted chart sources
- **Secrets in Charts**: Hardcoded secrets
- **RBAC**: Insufficient permissions for Helm
- **Repository Security**: Untrusted chart repositories


---

## Coding Practices

### Idiomatic Configuration


- **values.yaml**: Default values
- **values.yaml files**: Per-environment overrides
- **--set flags**: Command-line overrides
- **charts.yaml**: Chart metadata


### API Usage Patterns


- **Helm CLI**: Chart operations
- **Helm Library**: Programmatic use
- **Hooks**: Lifecycle events
- **Plugin API**: CLI extensions


### Observability Best Practices


- **Release History**: Track deployments
- **Hook Logs**: Lifecycle event logs
- **Chart Validation**: Template errors
- **Repository Metrics**: Chart downloads


### Testing Strategies


- **Unit Tests**: Template tests
- **Integration Tests**: Helm operations
- **E2E Tests**: Full deployment workflow
- **Compatibility Tests**: Kubernetes versions


### Development Workflow


- **Development**: Helm development setup
- **Testing**: Chart testing, linting
- **Debugging**: helm template, lint
- **Deployment**: Helm release
- **CI/CD**: Chart testing in CI
- **Tools**: helm, helm-lint, chart-testing


---

## Fundamentals

### Essential Concepts


- **Chart**: Package of Kubernetes manifests
- **Values**: Configuration for chart
- **Templates**: Rendered Kubernetes resources
- **Release**: Installed chart instance
- **Repository**: Chart storage location
- **Hook**: Lifecycle event
- **Dependency**: Chart dependencies
- **Chart.yaml**: Chart metadata file
- **values.yaml**: Default values file
- **Chart.lock**: Dependency resolution


### Terminology Glossary


- **Chart**: Package of manifests
- **Values**: Chart configuration
- **Templates**: Rendered resources
- **Release**: Installed chart
- **Repository**: Chart storage
- **Hook**: Lifecycle event
- **Dependency**: Chart dependency
- **Chart.yaml**: Metadata file
- **values.yaml**: Default values
- **Chart.lock**: Dependency lock


### Data Models and Types


- **Chart**: Chart metadata
- **Values**: Configuration values
- **Template**: Rendered template
- **Release**: Release data
- **Hook**: Hook definition
- **Dependency**: Dependency information
- **Manifest**: Rendered Kubernetes resource


### Lifecycle Management


- **Chart Lifecycle**: Create → Package → Publish
- **Release Lifecycle**: Install → Upgrade → Rollback → Uninstall
- **Hook Lifecycle**: Pre-install → Post-install → Pre-delete
- **Template Lifecycle**: Render → Validate → Apply


### State Management


- **Release State**: Installed charts
- **Revision State**: Release history
- **Hook State**: Hook execution state
- **Dependency State**: Resolved dependencies


---

## Scaling and Deployment Patterns

### Horizontal Scaling


- **Repository Scaling**: Chart repository scaling
- **API Server Load**: Helm client scaling
- **Release Storage**: Release state scaling


### High Availability


- **Repository HA**: Chart repository HA
- **Release Storage HA**: Storage backend HA


### Production Deployments


- **Repository Setup**: Private chart repository
- **Access Control**: Repository authentication
- **Release Management**: Version control and rollback
- **Security**: Chart signing, secret management
- **Integration**: GitOps workflow


### Upgrade Strategies


- **Chart Versioning**: Semantic versioning
- **Release History**: Rollback capability
- **Pre/Post Hooks**: Upgrade hooks
- **Dependency Resolution**: Chart dependency updates


### Resource Management


- **Chart Size**: Chart storage management
- **Release Storage**: Release state storage
- **Template Rendering**: Memory for template processing


---

## Additional Resources

- **Official Documentation:** [https://helm.sh/docs/](https://helm.sh/docs/)
- **GitHub Repository:** [github.com/helm/helm](https://github.com/helm/helm)
- **CNCF Project Page:** [cncf.io/projects/helm/](https://www.cncf.io/projects/helm/)
- **Community:** Check the GitHub repository for community channels
- **Versioning:** Refer to project's release notes for version-specific features

---

## Troubleshooting

### Common Issues

1. **Deployment Failures**
   - Check pod logs for errors
   - Verify configuration values
   - Ensure network connectivity

2. **Performance Issues**
   - Monitor resource usage
   - Adjust resource limits
   - Check for bottlenecks

3. **Configuration Errors**
   - Validate YAML syntax
   - Check required fields
   - Verify environment-specific settings

4. **Integration Problems**
   - Verify API compatibility
   - Check dependency versions
   - Review integration documentation

### Getting Help

- Check official documentation
- Search GitHub issues
- Join community channels
- Review logs and metrics
*Content generated automatically. Verify against official documentation before production use.*

## Tutorial

This tutorial will guide you through installing, configuring, and using Helm for Kubernetes application management.

### Prerequisites

Before beginning, ensure you have:
- A running Kubernetes cluster (minikube, kind, EKS, GKE, AKS, or any other)
- `kubectl` configured to access your cluster
- Basic understanding of Kubernetes concepts (pods, services, deployments)
- A package registry or container registry for storing charts

Verify your setup:

```bash
# Check cluster connectivity
kubectl cluster-info

# Verify kubectl configuration
kubectl get nodes

# Check Helm version (after installation)
helm version
```

---

### 1. Installation

Helm can be installed using various package managers or by downloading the binary directly.

#### Method 1: Using Homebrew (macOS/Linux)

```bash
# Add the Helm repository
brew install helm

# Verify installation
helm version
```

#### Method 2: Using Snap (Linux)

```bash
# Install Helm via Snap
sudo snap install helm --classic

# Verify installation
helm version
```

#### Method 3: Using curl (All Platforms)

```bash
# Download the latest release
curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Verify installation
helm version

# Or download a specific version
wget https://get.helm.sh/helm-v3.14.0-linux-amd64.tar.gz
tar -zxvf helm-v3.14.0-linux-amd64.tar.gz
sudo mv linux-amd64/helm /usr/local/bin/helm
```

#### Method 4: Using Chocolatey (Windows)

```bash
# Install Helm via Chocolatey
choco install kubernetes-helm

# Verify installation
helm version
```

---

### 2. Basic Configuration

#### Initialize Helm Repository

```bash
# Add the official Helm stable repository
helm repo add stable https://charts.helm.sh/stable

# Add the official Helm incubator repository
helm repo add incubator https://charts.helm.sh/incubator

# Add common chart repositories
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add jetstack https://charts.jetstack.io

# Update repositories to get latest charts
helm repo update

# List configured repositories
helm repo list
```

#### Configure Helm Settings

```bash
# View current Helm configuration
helm env

# Set default namespace for commands
export HELM_NAMESPACE=kube-system

# Configure Helm cache directory
export HELM_CACHE_HOME=/path/to/cache

# Configure Helm data directory
export HELM_DATA_HOME=/path/to/data
```

#### Create a Helm Chart Configuration

```yaml
# Chart.yaml - Chart metadata
apiVersion: v2
name: myapp
description: A Helm chart for Kubernetes
type: application
version: 1.0.0
appVersion: "1.16.0"
annotations:
  artifacthub.io/license: Apache-2.0
dependencies:
  - name: common
    version: "0.1.0"
    repository: "file://../common"
```

```yaml
# values.yaml - Default values for the chart
replicaCount: 1

image:
  repository: nginx
  tag: "1.19.0"
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80

resources:
  limits:
    cpu: 100m
    memory: 128Mi
  requests:
    cpu: 100m
    memory: 128Mi

nodeSelector: {}

tolerations: []

affinity: {}
```

---

### 3. Usage Examples

#### Creating a New Chart

```bash
# Create a new chart
helm create myapp

# Chart structure:
# myapp/
# ├── Chart.yaml
# ├── values.yaml
# ├── charts/ (dependencies)
# ├── templates/ (Kubernetes manifests)
# └── .helmignore

# View chart structure
ls -R myapp
```

#### Linting and Testing Charts

```bash
# Lint a chart without installation
helm lint ./myapp

# Lint with strict mode
helm lint --strict ./myapp

# Lint with values file
helm lint ./myapp -f values.yaml

# Render templates locally (dry-run)
helm template ./myapp

# Render with custom values
helm template ./myapp -f values.yaml

# Render and show diff
helm template ./myapp --debug
```

#### Installing Applications

```bash
# Install from repository
helm install myrelease bitnami/nginx

# Install with custom name
helm install myapp ./myapp

# Install with custom values
helm install myapp ./myapp -f values.yaml

# Install with set values
helm install myapp ./myapp \
  --set replicaCount=3 \
  --set image.tag=1.20.0

# Install with set string values
helm install myapp ./myapp \
  --set-string replicaCount=3 \
  --set-string image.tag=1.20.0

# Install with namespace
helm install myapp ./myapp --namespace production --create-namespace

# Install with atomic (rollback on failure)
helm install myapp ./myapp --atomic

# Install with timeout
helm install myapp ./myapp --timeout 5m
```

#### Upgrading and Rolling Back

```bash
# Upgrade a release with new values
helm upgrade myapp ./myapp -f values.yaml

# Upgrade with rollback on failure
helm upgrade myapp ./myapp --atomic

# Upgrade with custom values
helm upgrade myapp ./myapp \
  --set replicaCount=5

# View upgrade history
helm history myapp

# Rollback to previous revision
helm rollback myapp

# Rollback to specific revision
helm rollback myapp 3
```

#### Viewing Releases

```bash
# List all releases
helm list

# List releases in specific namespace
helm list -n production

# List releases with status
helm list --status deployed
helm list --status failed
helm list --status pending

# Get detailed release info
helm get values myapp

# Get all information about a release
helm get all myapp

# View release history
helm history myapp
```

#### Uninstalling Applications

```bash
# Uninstall a release
helm uninstall myapp

# Uninstall with dry-run
helm uninstall myapp --dry-run

# Uninstall with cascade (delete resources)
helm uninstall myapp --cascade
```

---

### 4. Common Operations

#### Monitoring Releases

```bash
# Watch release status
helm status myapp

# Get release values
helm get values myapp -a

# Get release notes
helm get notes myapp

# Get hooks
helm get hooks myapp

# Get manifest
helm get manifest myapp
```

#### Debugging Charts

```bash
# Debug template rendering
helm template ./myapp --debug

# Debug with values
helm template ./myapp -f values.yaml --debug

# Debug with include function
helm template ./myapp --show-only templates/deployment.yaml

# Debug with all templates
helm template ./myapp --show-only templates/*.*yaml
```

#### Chart Dependency Management

```bash
# Update chart dependencies
helm dependency update ./myapp

# List chart dependencies
helm dependency list ./myapp

# Add a new dependency
helm dependency add nginx --version 9.0.0

# Remove a dependency
helm dependency remove nginx
```

#### Chart Repository Operations

```bash
# Package a chart
helm package ./myapp

# Push chart to repository
helm push myapp-1.0.0.tgz oci://registry-1.docker.io/myorg

# Search charts in repository
helm search repo nginx

# SearchHub for charts across all repositories
helm search hub nginx

# Show chart info
helm show chart bitnami/nginx

# Show values documentation
helm show values bitnami/nginx

# Show README
helm show readme bitnami/nginx
```

---

### 5. Best Practices

#### Chart Development Best Practices

1. **Version Your Charts**: Use semantic versioning for both chart version and appVersion
2. **Document Your Charts**: Include comprehensive README and values documentation
3. **Use templates**: Avoid hardcoding values; use Helm templating
4. **Set Resource Limits**: Always specify resource requests and limits
5. **Use Namespaces**: Deploy to specific namespaces for isolation
6. **Test Locally**: Use `helm template` and `helm lint` before pushing
7. **Version Control**: Keep charts in version control with proper branching
8. **Security Scanning**: Scan charts for secrets and vulnerabilities

#### Release Management Best Practices

1. **Use Atomic Upgrades**: Set `--atomic` flag to ensure rollback on failure
2. **Set Timeouts**: Define appropriate timeouts for releases
3. **Monitor Releases**: Regularly check release status and health
4. **Keep History**: Retain enough release history for rollback capability
5. **Use Descriptive Names**: Choose clear, descriptive release names
6. **Document Changes**: Document changes between releases
7. **Test in Staging**: Test upgrades in staging before production
8. **Set Resource Quotas**: Configure resource quotas per namespace

#### Security Best Practices

1. **Use Private Registries**: Store sensitive charts in private repositories
2. **Sign Charts**: Use chart signing for integrity verification
3. **RBAC**: Implement proper RBAC for Helm operations
4. **Secret Management**: Use external secret management (Vault, Sealed Secrets)
5. **Audit Logging**: Enable audit logging for Helm operations
6. **Network Policies**: Configure network policies for deployed applications
7. **Image Verification**: Use image digests instead of tags
8. **Limit RBAC**: Grant minimal required permissions

#### CI/CD Integration Best Practices

1. **Lint in CI**: Add `helm lint` to CI pipeline
2. **Test Templates**: Use `helm unittest` for template testing
3. **Automate Testing**: Implement automated testing for charts
4. **Version Management**: Automate version increments
5. **Artifact Storage**: Store packaged charts in artifact repository
6. **Security Scanning**: Integrate security scanning in CI/CD
7. **Progressive Delivery**: Use progressive delivery strategies
8. **Monitoring**: Set up monitoring for deployed applications

*Content generated automatically. Verify against official documentation before production use.*

## Examples

### Basic Chart with Values Configuration


```yaml
# Chart.yaml
apiVersion: v2
name: myapp
description: A Helm chart for Kubernetes
type: application
version: 1.0.0
appVersion: "1.16.0"
dependencies:
  - name: common
    version: "0.1.0"
    repository: "file://../common"

# values.yaml
replicaCount: 3

image:
  repository: myregistry/myapp
  tag: "1.0.0"
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80
  targetPort: 8080

resources:
  limits:
    cpu: 100m
    memory: 128Mi
  requests:
    cpu: 50m
    memory: 64Mi

# values-production.yaml
replicaCount: 5

image:
  tag: "1.0.0-prod"

resources:
  limits:
    cpu: 500m
    memory: 512Mi
```

### Chart with Hooks for Database Migration


```yaml
# templates/pre-upgrade-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ .Release.Name }}-db-migrate
  labels:
    helm.sh/chart: "{{ .Chart.Name }}-{{ .Chart.Version }}"
  annotations:
    "helm.sh/hook": pre-upgrade
    "helm.sh/hook-weight": "-5"
    "helm.sh/hook-delete-policy": hook-succeeded
spec:
  template:
    metadata:
      name: {{ .Release.Name }}-db-migrate
    spec:
      containers:
      - name: migrate
        image: {{ .Values.image.repository }}:{{ .Values.image.tag }}
        command: ["sh", "-c", "python manage.py migrate"]
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: {{ .Release.Name }}-db-secrets
              key: database-url
      restartPolicy: Never
  backoffLimit: 3
```

### Complex Chart with Subcharts and Templates


```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "myapp.fullname" . }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      {{- include "myapp.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "myapp.selectorLabels" . | nindent 8 }}
    spec:
      {{- with .Values.imagePullSecrets }}
      imagePullSecrets:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      serviceAccountName: {{ include "myapp.serviceAccountName" . }}
      securityContext:
        {{- toYaml .Values.podSecurityContext | nindent 8 }}
      containers:
        - name: {{ .Chart.Name }}
          securityContext:
            {{- toYaml .Values.securityContext | nindent 12 }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - name: http
              containerPort: {{ .Values.service.targetPort }}
              protocol: TCP
          livenessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: {{ .Values.probe.initialDelaySeconds }}
            periodSeconds: {{ .Values.probe.periodSeconds }}
          readinessProbe:
            httpGet:
              path: /ready
              port: http
            initialDelaySeconds: {{ .Values.probe.initialDelaySeconds }}
            periodSeconds: {{ .Values.probe.periodSeconds }}
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
      {{- with .Values.nodeSelector }}
      nodeSelector:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .Values.affinity }}
      affinity:
        {{- toYaml . | nindent 8 }}
      {{- end }}
```

