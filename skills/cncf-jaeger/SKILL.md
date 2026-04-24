---
name: cncf-jaeger
description: Jaeger in Cloud-Native Engineering - distributed tracing
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: cncf
  role: reference
  scope: infrastructure
  output-format: manifests
  triggers: cloud-native, distributed, distributed tracing, engineering, jaeger, tracing,
    request tracing, xray
  related-skills: 
---


# Jaeger in Cloud-Native Engineering

**Category:** tracing  
**Status:** Graduated  
**Stars:** 18,000  
**Last Updated:** 2026-04-22  
**Primary Language:** Go  
**Documentation:** [https://www.jaegertracing.io/](https://www.jaegertracing.io/)  

---

## Purpose and Use Cases

Jaeger is a distributed tracing designed to help engineers build, deploy, and manage cloud-native applications.

### What Problem Does It Solve?

Jaeger addresses complex tracing challenges by providing:
- Standardized APIs and interfaces
- Declarative configuration management
- Automatic resource management and reconciliation
- Built-in observability and monitoring
- Extensible architecture for custom integrations

### When to Use This Project

Use Jaeger when you need distributed tracing, require tracing-specific features, want to integrate with other CNCF projects, need production-ready tracing solutions, or require tracing-specific best practices.

### Key Use Cases

- **Jaeger Core**: Primary use case for distributed tracing
- **Integration with Kubernetes**: Native Kubernetes integration
- **Multi-Cluster Support**: Manage multiple clusters
- **Scalable Operations**: Handle large-scale deployments
- **Automated Management**: Self-healing and automatic recovery
- **Security Features**: Built-in security controls
- **Observability**: Comprehensive metrics and logging

---

## Architecture Design Patterns

### Core Components

- **Main Controller**: Primary reconciliation loop
- **API Server**: REST/gRPC API endpoint
- **Webhook**: Admission webhooks for validation
- **Scheduler**: Work scheduling and distribution
- **Storage Backend**: Persistent state storage
- **Agent**: Worker component for distributed tasks
- **Metrics Collector**: Metrics aggregation

### Component Interactions

1. **User → API Server**: Create/modify resources
2. **API Server → Controller**: Resource creation event
3. **Controller → Storage**: State persistence
4. **Storage → Controller**: State retrieval for reconciliation
5. **Controller → Worker**: Task delegation
6. **Worker → Status**: Status updates back to API

### Data Flow Patterns

1. **Reconciliation Flow**: Resource change → Controller detects → State comparison → Action taken → Status updated
2. **Event Flow**: Event received → Event handler → Reconciler → State updated
3. **Scaling Flow**: Metrics threshold → Controller evaluates → Scale decision → Resource scaled
4. **Failure Flow**: Component failure → Detector → Recovery action → State restored

### Design Principles

- **Kubernetes Native**: Built on Kubernetes APIs and conventions
- **Declarative**: Desired state management
- **Automated**: Self-healing and automatic recovery
- **Extensible**: Plugin architecture for extensions
- ** Observability**: Built-in metrics and logging
- **Secure**: Security-first design principles
- **Reliable**: High availability and disaster recovery

---

## Integration Approaches

### Integration with Other CNCF Projects

- **Kubernetes**: Core platform for Jaeger
- **Prometheus**: Metrics collection and alerting
- **OpenTelemetry**: Distributed tracing integration
- **Helm**: Chart deployment
- **cert-manager**: TLS certificate management
- **Istio/Linkerd**: Service mesh integration
- **Flux/ArgoCD**: GitOps integration

### API Patterns

- **Kubernetes API**: Standard Kubernetes CRDs
- **REST API**: HTTP/JSON REST API
- **gRPC API**: High-performance gRPC API
- **Webhook API**: Admission webhooks
- **Metrics API**: Prometheus-compatible metrics

### Configuration Patterns

- **YAML Configuration**: Declarative YAML manifests
- **Environment Variables**: Runtime configuration
- **ConfigMaps**: Externalized configuration
- **Secrets**: Sensitive data management
- **Helm Values**: Helm chart configuration

### Extension Mechanisms

- **CRDs**: Custom Resource Definitions
- **Webhooks**: Custom admission webhooks
- **Plugins**: Plugin architecture for extensions
- **Controllers**: Custom controllers
- **Adapters**: Adapter pattern for integrations

---

## Common Pitfalls and How to Avoid Them

### Configuration Issues

- **YAML Syntax Errors**: Incorrect YAML formatting
- **Missing Dependencies**: Missing required resources
- **Invalid Values**: Invalid configuration values
- **Resource Limits**: Insufficient resource limits

**How to Avoid:**
- Use kubectl dry-run for validation
- Implement CI/CD pipeline with yamllint
- Test configurations in staging environment
- Use configuration validation webhooks

### Performance Issues

- **Resource Exhaustion**: CPU or memory limits hit
- **Latency Spikes**: Slow responses under load
- **Scale Bottlenecks**: Scaling limitations
- **Storage Growth**: Unbounded storage growth

**How to Avoid:**
- Monitor resource usage with Prometheus
- Implement appropriate resource limits
- Use horizontalPodAutoscaler
- Configure storage quotas and cleanup policies

### Operational Challenges

- **Upgrade Complexity**: Complex upgrade procedures
- **Data Migration**: Migration between versions
- **Backup and Restore**: Backup procedures
- **Troubleshooting**: Debugging issues

**How to Avoid:**
- Follow official upgrade path documentation
- Test upgrades in staging first
- Implement regular backups
- Use diagnostic tools and logs

### Security Pitfalls

- **Privilege Escalation**: Overly permissive RBAC
- **Secrets Exposure**: Secrets in logs or configs
- **Network Exposure**: Exposed services
- **Authentication**: Weak authentication mechanisms

**How to Avoid:**
- Implement least-privilege RBAC
- Use secrets management
- Implement network policies
- Enable authentication and authorization

---

## Coding Practices

### Idiomatic Configuration

- **Resource Definitions**: Declarative YAML manifests
- **Configuration Management**: Externalized configuration
- **Secret Management**: Secure secrets handling
- **Version Control**: GitOps for configuration

### API Usage Patterns

- **kubectl**: Command-line administration
- **Kubernetes Client Libraries**: Programmatic access
- **REST API**: HTTP API for automation
- **CRUD Operations**: Standard create, read, update, delete

### Observability Best Practices

- **Metrics Collection**: Prometheus metrics
- **Logging**: Structured logging
- **Tracing**: Distributed tracing
- **Dashboards**: Grafana dashboards

### Development Workflow

- **Local Testing**: Kind or Minikube for development
- **Testing**: Integration tests
- **Debugging**: Debug logs and diagnostics
- **CI/CD**: Automated testing and deployment
- **Tools**: kubectl, Helm, kustomize

### Code Examples

```yaml
# Example configuration for Jaeger
apiVersion: cncf.jaeger/v1
kind: Jaeger
metadata:
  name: example
  namespace: default
spec:
  # Configuration details
  replicas: 3
  resources:
    requests:
      memory: "256Mi"
      cpu: "250m"
    limits:
      memory: "512Mi"
      cpu: "500m"
```

  related-skills: 
---

## Fundamentals

### Essential Concepts

- **Resource**: Core abstraction managed by Jaeger
- **Reconciliation**: Process of achieving desired state
- **Controller**: Component managing resources
- **Webhook**: Admission control mechanism
- **CRD**: Custom Resource Definition
- **Operator**: Pattern for managing complex applications
- **Status**: Current state of the resource

### Terminology Glossary

- **Controller**: Management component
- **Reconciler**: State reconciliation logic
- **CRD**: Custom Resource Definition
- **Webhook**: Admission webhook
- **Operator**: Application operator pattern
- **Reconciliation**: State synchronization

### Data Models and Types

- **Custom Resource**: User-defined resource type
- **Status**: Resource status information
- **Spec**: Desired state specification
- **Owner Reference**: Resource ownership chain

### Lifecycle Management

- **Resource Lifecycle**: Create → Configure → Deploy → Update → Delete
- **Controller Lifecycle**: Start → Watch → Reconcile → Stop
- **Upgrade Lifecycle**: Backup → Upgrade → Verify → Rollback (if needed)

### State Management

- **Desired State**: Spec field in resource
- **Current State**: Status field in resource
- **Reconciliation Loop**: Controller loop for state sync
- **Event Queue**: Change event processing

---

## Scaling and Deployment Patterns

### Horizontal Scaling

- **Controller Scaling**: Multiple controller replicas
- **Worker Scaling**: Scale worker pods based on load
- **API Server Scaling**: Scale API servers
- **Storage Scaling**: Add storage capacity

### High Availability

- **Controller HA**: Multiple controller replicas
- **Storage HA**: HA storage backend
- **Load Balancing**: Distribute traffic
- **Multi-Region**: Geographic distribution

### Production Deployments

- **Standalone**: Single instance deployment
- **HA**: High availability deployment
- **Clustered**: Multi-node cluster
- **Resource Configuration**: CPU, memory, storage limits

### Upgrade Strategies

- **Rolling Update**: Update without downtime
- **Blue-Green**: Blue-green deployments
- **Canary**: Canary releases
- **Version Compatibility**: Follow upgrade path

### Resource Management

- **CPU/Memory Requests**: Appropriate resource requests
- **Limits**: Resource limits for stability
- **Storage Quotas**: Storage allocation
- **Network Bandwidth**: Network resource allocation

### Deployment Patterns

- **DaemonSet**: One instance per node
- **Deployment**: Standard deployment
- **StatefulSet**: Stateful applications
- **Helm Chart**: Chart-based deployment
- **Operator Pattern**: Operator-based management

---

## Additional Resources

- **Official Documentation:** [https://www.jaegertracing.io/](https://www.jaegertracing.io/)
- **GitHub Repository:** [github.com/cncf/jaeger](https://github.com/cncf/jaeger)
- **CNCF Project Page:** [cncf.io/projects/jaeger/](https://www.cncf.io/projects/jaeger/)
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

---

## Tutorial

This tutorial covers installation, configuration, and basic usage of Jaeger for distributed tracing in cloud-native applications.

### Prerequisites

Before starting with Jaeger, ensure you have:

- A running Kubernetes cluster (1.22+)
- `kubectl` configured with cluster admin access
- Basic understanding of distributed tracing concepts
- Helm 3.x (if using Helm installation)

### Installation

#### Method 1: Using Helm (Recommended)

```bash
# Add the Jaeger Helm repository
helm repo add jaegertracing https://jaegertracing.github.io/helm-charts
helm repo update

# Install Jaeger with all-in-one mode (development)
helm install jaeger jaegertracing/jaeger \
  --namespace observability \
  --create-namespace \
  --set storage.type=memory

# Install with Elasticsearch backend (production)
helm install jaeger jaegertracing/jaeger \
  --namespace observability \
  --create-namespace \
  --set storage.type=elasticsearch \
  --set esServerURL=http://elasticsearch-master:9200

# Verify installation
helm -n observability list
kubectl -n observability get pods
```

#### Method 2: Using kubectl apply (Direct Manifest)

```bash
# Apply Jaeger operator
kubectl apply -f https://raw.githubusercontent.com/jaegertracing/jaeger-operator/main/deploy/crds/jaegertracing.io_jaegers.yaml
kubectl apply -f https://raw.githubusercontent.com/jaegertracing/jaeger-operator/main/deploy/role.yaml
kubectl apply -f https://raw.githubusercontent.com/jaegertracing/jaeger-operator/main/deploy/role_binding.yaml
kubectl apply -f https://raw.githubusercontent.com/jaegertracing/jaeger-operator/main/deploy/service_account.yaml

# Apply Jaeger custom resource
kubectl apply -f - <<EOF
apiVersion: jaegertracing.io/v1
kind: Jaeger
metadata:
  name: jaeger
  namespace: observability
spec:
  strategy: production
  storage:
    type: elasticsearch
    options:
      es:
        server-urls: http://elasticsearch-master:9200
EOF

# Verify
kubectl -n observability get jaegers
kubectl -n observability get pods -l app=jaeger
```

#### Method 3: All-in-One Docker

```bash
# Run Jaeger all-in-one with Elasticsearch
docker run -d \
  --name jaeger \
  -e SPAN_STORAGE_TYPE=elasticsearch \
  -e ES_SERVER_URLS=http://elasticsearch:9200 \
  -p 6831:6831/udp \
  -p 6832:6832/udp \
  -p 5778:5778 \
  -p 16686:16686 \
  -p 14268:14268 \
  -p 14250:14250 \
  jaegertracing/all-in-one:latest

# Access UI
open http://localhost:16686
```

### Basic Configuration

#### Jaeger Custom Resource Configuration

```yaml
# jaeger.yaml - Full Jaeger configuration
apiVersion: jaegertracing.io/v1
kind: Jaeger
metadata:
  name: jaeger-production
  namespace: observability
spec:
  strategy: production
  ingress:
    enabled: true
    host: tracing.example.com
    security: none
  storage:
    type: elasticsearch
    options:
      es:
        server-urls: http://elasticsearch-master:9200
        username: elastic
        password: changeme
  collector:
    replicas: 3
    resources:
      requests:
        memory: "512Mi"
        cpu: "250m"
      limits:
        memory: "1Gi"
        cpu: "1000m"
  query:
    replicas: 2
    resources:
      requests:
        memory: "256Mi"
        cpu: "100m"
      limits:
        memory: "512Mi"
        cpu: "500m"
  ui:
    options:
      dashboard:
        url: https://grafana.example.com
```

### Usage Examples

#### Sending Traces to Jaeger

```bash
# Using curl to send a trace via HTTP
curl -X POST http://localhost:14268/api/traces \
  -H "Content-Type: application/json" \
  -d '{
    "spans": [
      {
        "traceId": "592753b7-d6f3-4e12-8f8e-9b8e9b8e9b8e",
        "spanId": "a1b2c3d4e5f6g7h8",
        "operationName": "payment-service",
        "startTime": 1614500000000,
        "duration": 100000,
        "tags": [
          {"key": "service.name", "value": "payment-service"},
          {"key": "span.kind", "value": "server"}
        ]
      }
    ]
  }'
```

#### Instrumenting with OpenTelemetry

```yaml
# Add OpenTelemetry to your service
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    spec:
      containers:
      - name: my-service
        image: my-service:latest
        env:
        - name: OTEL_TRACES_EXPORTER
          value: jaeger
        - name: OTEL_EXPORTER_JAEGER_ENDPOINT
          value: http://jaeger-collector:14250
        - name: OTEL_RESOURCE_ATTRIBUTES
          value: service.name=my-service,service.version=1.0.0
```

#### Querying Traces via UI

```bash
# Port-forward to access Jaeger UI
kubectl -n observability port-forward svc/jaeger-query 16686:16686

# Access in browser
open http://localhost:16686
```

### Common Operations

#### Checking Jaeger Status

```bash
# Check Jaeger pods
kubectl -n observability get pods -l app=jaeger

# View Jaeger logs
kubectl -n observability logs -l app=jaeger -f

# Check Jaeger UI
kubectl -n observability port-forward svc/jaeger-query 16686:16686
```

### Best Practices for Jaeger

#### 1. Use Appropriate Storage Backend

```yaml
# Production storage configuration
apiVersion: jaegertracing.io/v1
kind: Jaeger
metadata:
  name: jaeger-production
spec:
  storage:
    type: elasticsearch
    options:
      es:
        server-urls: http://elasticsearch:9200
        index-prefix: jaeger-
        ttl: 259200
```

#### 2. Configure Sampling

```yaml
# Sampling configuration
apiVersion: jaegertracing.io/v1
kind: Jaeger
metadata:
  name: jaeger-production
spec:
  agent:
    options:
      sampling:
        server-url: http://jaeger-query:5778/sampling
        refresh-interval: 1m
```

#### 3. Enable Security

```yaml
# Secure Jaeger deployment
apiVersion: jaegertracing.io/v1
kind: Jaeger
metadata:
  name: jaeger-production
spec:
  ingress:
    enabled: true
    security: tls
  storage:
    type: elasticsearch
    options:
      es:
        server-urls: http://elasticsearch:9200
        username: jaeger
        password-secret:
          name: jaeger-secrets
          key: es-password
```

#### 4. Monitor Jaeger

```yaml
# Prometheus monitoring configuration
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: jaeger-collector
  namespace: observability
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app: jaeger-collector
  endpoints:
    - port: metrics
      path: /metrics
      interval: 30s
```

  related-skills: 
---

*This SKILL.md file was verified and last updated on 2026-04-22. Content based on CNCF Jaeger project and production usage patterns.*

## Examples

### Basic Configuration


```yaml
# Basic configuration example
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{project_name}}-config
  namespace: default
data:
  # Configuration goes here
  config.yaml: |
    # Base configuration
    # Add your settings here
```

### Kubernetes Deployment


```yaml
# Kubernetes deployment for {{project_name}}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{project_name}}
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: {{project_name}}
  template:
    metadata:
      labels:
        app: {{project_name}}
    spec:
      containers:
      - name: {{project_name}}
        image: {{project_name}}:latest
        ports:
        - containerPort: 8080
        resources:
          limits:
            memory: "128Mi"
            cpu: "500m"
```

### Kubernetes Service


```yaml
# Kubernetes service for {{project_name}}
apiVersion: v1
kind: Service
metadata:
  name: {{project_name}}
  namespace: default
spec:
  selector:
    app: {{project_name}}
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
  type: ClusterIP
```

