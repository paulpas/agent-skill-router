---
name: cncf-linkerd
description: Linkerd in Service Mesh - cloud native architecture, patterns, pitfalls,
  and best practices
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: cncf
  role: reference
  scope: infrastructure
  output-format: manifests
  triggers: cdn, infrastructure as code, k8s service, kubernetes service, linkerd,
    monitoring, native, service
  related-skills: cncf-calico, cncf-cilium, cncf-contour, cncf-kuma
---

# Linkerd in Cloud-Native Engineering

## Purpose and Use Cases

### What Problem Does It Solve?
- **Zero-trust service communication**: Provides secure, observable, and reliable service-to-service communication without code changes
- **Operational simplicity**: Lightweight service mesh that focuses on observability, reliability, and security with minimal configuration
- **Performance overhead reduction**: Minimal latency addition (typically <1ms) compared to heavier mesh alternatives
- **Security without encryption complexity**: Automatic mTLS with certificate rotation, identity-based policies, and audit logging
- **Platform abstraction**: Works across Kubernetes, bare metal, VMs, and hybrid environments

### When to Use
- **Kubernetes-first deployments**: When Kubernetes is your primary platform and you need service mesh capabilities
- **Gradual adoption**: When you want to start small and incrementally adopt mesh features
- **Observability requirements**: When you need distributed tracing, metrics, and service maps out of the box
- **Security compliance**: When you need mTLS, identity-based access control, and audit trails
- **Resource-constrained environments**: When you need a lightweight mesh with minimal resource overhead

### Key Use Cases
- **Service-to-service mTLS**: Automatically encrypt all service communication
- **Traffic splitting**: Canary deployments, A/B testing with traffic policies
- **Observability dashboards**: Real-time service health, latency, and error rate metrics
- **Policy enforcement**: Access control between services based on identity
- **Resilience patterns**: Circuit breaking, retries, and timeouts for service reliability

## Architecture Design Patterns

### Core Components

#### Control Plane
```
control-plane
├── linkerd-controller (identity, web, tap, destination)
├── linkerd-proxy-injector (admission webhook)
└── linkerd-prometheus (metrics collection)
```
- **Controller**: Manages mesh configuration and state
- **Identity service**: Provides mTLS certificates with short-lived TTL
- **Web service**: UI and API server
- **Tap service**: Real-time traffic observation endpoint
- **Destination service**: Service discovery and load balancing
- **Proxy injector**: Admits pods with sidecar proxy injection

#### Data Plane (Proxy)
```
pod
├── application container
└── linkerd-proxy sidecar container
    ├── inbound listener
    ├── outbound listener
    └── metrics collection
```
- **-proxy**:Transparent proxy that intercepts all traffic
- **Inbound listener**: Handles incoming connections with mTLS
- **Outbound listener**: Routes outgoing traffic with load balancing
- **Metrics**: Collects latency, success rate, and throughput

### Component Interactions
```
Client Pod
    ↓ (proxy intercepts)
Linkerd Proxy (Outbound)
    ↓ (mTLS)
Service Mesh Network
    ↓ (destination service lookup)
Linkerd Proxy (Inbound)
    ↓ (proxy forwards)
Server Pod
```

### Data Flow Patterns

#### Request Flow
```
1. Application sends request to localhost
2. Proxy intercepts and encrypts with mTLS
3. Proxy uses destination service for routing
4. Request forwarded to destination proxy
5. Destination proxy validates certificate and forwards
6. Application receives decrypted response
```

#### Certificate Flow
```
1. Proxy requests certificate from identity service
2. Identity service validates pod identity
3. Certificate issued with short TTL (8 hours default)
4. Certificate rotated automatically before expiration
5. Certificate revocation supported for compromised pods
```

### Design Principles

#### Transparency
- **Zero code changes required**: Proxy intercepts all traffic automatically
- **No service awareness needed**: Works with any application protocol
- **Non-invasive**: Can be added/removed without application changes

#### Security First
- **Automatic mTLS**: All communication encrypted by default
- **Short-lived certificates**: Automatic rotation every 8 hours
- **Identity-based policies**: Access control based on service identity
- **Audit logging**: All policy decisions logged

#### Observability
- **Built-in metrics**: Latency, success rate, throughput
- **Service graphs**: Visualize service dependencies
- **Tap capability**: Real-time request inspection
- **Debugging tools**: CLI tools for troubleshooting

## Integration Approaches

### Integration with Other CNCF Projects

#### Prometheus Integration
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: linkerd-prometheus-config
data:
  prometheus.yaml: |
    scrape_configs:
      - job_name: 'linkerd-proxy'
        static_configs:
          - targets: ['localhost:4191']
```
- **Metrics scraping**: Proxy exposes `/metrics` endpoint
- **Dashboards**: Pre-built Grafana dashboards available
- **Alerting**: Alertmanager integration for SLO violations

#### Grafana Integration
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: linkerd-grafana-dashboards
data:
  linkerd-service-dashboard.json: |
    {
      "annotations": {},
      "panels": [
        // Linkerd service panels
      ]
    }
```
- **Service dashboard**: Real-time service health visualization
- **Mesh dashboard**: Complete mesh topology
- **Resource dashboard**: CPU, memory usage by proxy

#### OPA Integration
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-policy
spec:
  podSelector:
    matchLabels:
      app: payment-service
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              linkerd.io/control-plane-namespace: linkerd
              linkerd.io/proxy-deployment: payment-gateway
```
- **Policy enforcement**: Kubernetes NetworkPolicies + Linkerd policies
- **Custom policies**: OPA Gatekeeper for additional compliance

#### Jaeger Integration
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: linkerd-jaeger-config
data:
  jaeger.yaml: |
    endpoint: jaeger-collector:14268
    tags: |
      service.name=linkerd-proxy
```
- **Distributed tracing**: Linkerd integrates with existing tracing systems
- **Request IDs**: Propagates trace context
- **Latency tracking**: End-to-end latency measurement

### API Patterns

#### Service Profile API
```yaml
apiVersion: linkerd.io/v1alpha2
kind: ServiceProfile
metadata:
  name: payments-service.default.svc.cluster.local
spec:
  routes:
    - name: GET /payments
      condition:
        method: GET
        pathRegex: /payments
      responseTimeout: 1s
    - name: POST /payments
      condition:
        method: POST
        pathRegex: /payments
      retryBudget:
        retryRatio: 0.2
        minRetriesPerSecond: 10
        ttl: 30s
  decisionTimeout: 100ms
```
- **Route definitions**: HTTP route-based policies
- **Timeouts and retries**: Per-route configuration
- **Rate limiting**: Request rate control

#### Authorization Policy API
```yaml
apiVersion: policy.linkerd.io/v1beta1
kind: ServerPolicy
metadata:
  name: payments-service-policy
spec:
  selector:
    matchLabels:
      app: payments-service
  rules:
    - ports:
        - port: 8080
      authenticationModes:
        - PERMISSIVE
        - STRICT
---
apiVersion: policy.linkerd.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-ingress
spec:
  selector:
    matchLabels:
      app: payments-service
  action: Allow
  rules:
    - from:
        - source:
            namespaces: [ingress-namespace]
            namespacesNot: [internal-namespace]
        - source:
            principals: [cluster.local/ns/default/sa/ingress-proxy]
```
- **ServerPolicy**: Controls how services accept connections
- **AuthorizationPolicy**: Controls which services can communicate
- **Principals**: Identity-based access control

### Configuration Patterns

#### Mesh Configuration
```yaml
apiVersion: linkerd.io/v1alpha2
kind: LinkerdConfig
metadata:
  name: linkerd-config
  namespace: linkerd
spec:
  global:
    outboundPortExclusionList:
      - port: 9090
        protocol: HTTP
  proxy:
    inboundPort: 4143
    outboundPort: 4140
    controlPort: 4190
    dataPort: 4143
    adminPort: 4191
    metricsPath: /metrics
```

#### Resource Limits
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: linkerd-proxy-config
data:
  config.yaml: |
    outbound:
      port: 4140
      portExclusionList:
        - port: 9090
          protocol: HTTP
    inbound:
      port: 4143
    admin:
      port: 4191
```

### Extension Mechanisms

#### Custom Probes
- **Health endpoint**: Proxy exposes health check endpoint
- **Readiness probe**: Kubernetes readiness checks proxy
- **Liveness probe**: Automatic proxy health monitoring

#### Custom Metrics
- ** Prometheus metrics**: Standard metrics format
- **Custom labels**: Add application-specific labels
- **Metric filtering**: Export only required metrics

## Common Pitfalls and How to Avoid Them

### Configuration Issues

#### Proxy Injection Failures
**Problem**: Pods fail to start when proxy injection fails.

**Solution**:
```bash
# Check injection status
kubectl get pods -o json | jq '.items[].metadata.annotations["linkerd.io/inject"]'

# Force injection
kubectl patch deployment my-app -p '{"spec":{"template":{"metadata":{"annotations":{"linkerd.io/inject":"enabled"}}}}}'

# View injection logs
kubectl logs -n linkerd deploy/linkerd-proxy-injector
```

#### Port Exclusion Conflicts
**Problem**: Critical ports excluded from proxy interception.

**Solution**:
```yaml
# Exclude only non-HTTP ports
spec:
  proxy:
    outboundPortExclusionList:
      - port: 9090
        protocol: HTTP
```

#### Certificate Issues
**Problem**: mTLS failures due to certificate problems.

**Solutions**:
```bash
# Check certificate status
linkerd edges identity

# Rotate certificates
linkerd identity renew

# Verify certificates
linkerd viz check --proxy
```

### Performance Issues

#### Proxy Resource Consumption
**Problem**: Proxies consume significant CPU/memory.

**Solutions**:
```yaml
# Set resource limits
spec:
  containers:
    - name: linkerd-proxy
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
        limits:
          cpu: 500m
          memory: 256Mi
```

#### Latency Addition
**Problem**: Unexpected latency from proxy.

**Solutions**:
- Use Linkerd's zero-copy proxy where possible
- Enable connection pooling
- Minimize the number of proxies in request chain
- Use service profiles for optimization

#### Connection Exhaustion
**Problem**: Too many connections exhaust proxy resources.

**Solutions**:
- Configure connection pooling
- Use HTTP/2 multiplexing
- Set reasonable connection limits
- Monitor connection metrics

### Operational Challenges

#### Debugging Complexity
**Problem**: Issues harder to diagnose with transparent proxy.

**Solutions**:
```bash
# Use linkerd tap for real-time traffic
linkerd tap deploy/web-app

# Check proxy status
linkerd -n default proxies

# View proxy logs
linkerd -n default logs -c linkerd-proxy deploy/web-app
```

#### Rolling Updates
**Problem**: Proxy updates cause pod restarts.

**Solutions**:
- Use linkerd upgrade to update mesh
- Configure graceful proxy shutdown
- Update one namespace at a time
- Monitor for issues during rollout

#### Version Compatibility
**Problem**: Controller and proxy version mismatch.

**Solutions**:
- Always use linkerd upgrade for version updates
- Check version compatibility before upgrade
- Use linkerd check --proxy to verify proxy versions
- Plan rollback procedures

### Security Pitfalls

#### Identity Misconfiguration
**Problem**: Services can impersonate other services.

**Solutions**:
```bash
# Verify identity configuration
linkerd viz check

# Check certificates
linkerd edges identity
```

#### Policy Over-permissiveness
**Problem**: Too permissive access policies.

**Solutions**:
- Start with strict policies
- Use namespaces and service accounts for granularity
- Regular policy audits
- Enable audit logging

#### Secret Exposure
**Problem**: TLS secrets exposed in logs or events.

**Solutions**:
```bash
# Check for secrets in events
kubectl get events --field-selector type=Warning

# Audit proxy logs for sensitive data
linkerd logs -c linkerd-proxy | grep -v tls
```

## Coding Practices

### Idiomatic Configuration

#### Deployment with Mesh
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  annotations:
    linkerd.io/inject: enabled
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
      annotations:
        linkerd.io/inject: enabled
    spec:
      containers:
        - name: app
          image: web-app:latest
          ports:
            - containerPort: 8080
```

#### Service Profile
```yaml
apiVersion: linkerd.io/v1alpha2
kind: ServiceProfile
metadata:
  name: api-service.default.svc.cluster.local
spec:
  routes:
    - name: GET /api/users
      condition:
        method: GET
        pathRegex: /api/users
      responseTimeout: 500ms
      retries:
        budget:
          retryRatio: 0.1
          minRetriesPerSecond: 5
          ttl: 10s
```

### API Usage Patterns

#### Traffic Split
```bash
# Create traffic split for canary
linkerd multicluster link --cluster-name cluster-1 cluster-1-linkerd-service

# Configure traffic split
kubectl apply -f - <<EOF
apiVersion: split.smi-spec.io/v1alpha1
kind: TrafficSplit
metadata:
  name: web-app-split
spec:
  service: web-app
  backends:
    - service: web-app-v1
      weight: 90
    - service: web-app-v2
      weight: 10
EOF
```

#### Policy Enforcement
```bash
# Create policy allowing only specific services
linkerd edges policy -n default
```

### Observability Best Practices

#### Metrics Collection
- **Proxy metrics**: Latency, throughput, success rate
- **Service metrics**: Per-service request counts
- **Custom metrics**: Application-specific metrics
- **Alerting**: SLO-based alerting

#### Logging Strategy
- **Proxy logs**: Access logs with request IDs
- **Service logs**: Correlate with proxy logs
- **Audit logs**: Policy decisions and security events
- **Log levels**: Debug for troubleshooting, info for production

### Development Workflow

#### Local Development
1. Install Linkerd locally
2. Enable mesh for development namespace
3. Test with proxy injection
4. Use linkerd viz for debugging
5. Disable mesh for non-mesh services

#### CI/CD Integration
```yaml
# GitHub Actions example
- name: Install Linkerd
  run: |
    curl --proto '=https' --tlsv1.2 -sSfL https://run.linkerd.io/install | sh
    export PATH=$PATH:~/.linkerd2/bin
- name: Verify Installation
  run: linkerd check --expected-version=stable-2.14.0
- name: Mesh Deployments
  run: |
    kubectl get deploy -o yaml | \
    linkerd inject - | \
    kubectl apply -f -
```

## Fundamentals

### Essential Concepts

#### Linkerd Architecture
- **Control plane**: Manages mesh configuration and state
- **Data plane**: Proxy sidecars intercepting traffic
- **Service profiles**: Traffic policies and routing rules
- **Identity**: mTLS certificates with short TTL
- **Policies**: Access control and authorization

#### mTLS Flow
1. Certificate request to identity service
2. Certificate issued with pod identity
3. Short-lived certificates (8 hours default)
4. Automatic rotation before expiration
5. Certificate revocation for compromised pods

### Terminology Glossary

| Term | Definition |
|------|------------|
| **Linkerd** | Lightweight service mesh for Kubernetes |
| **Proxy** | Transparent sidecar that intercepts all traffic |
| **Control Plane** | Components managing mesh configuration |
| **Service Profile** | Traffic policy definition for a service |
| **mTLS** | Mutual TLS between services |
| **Identity** | Service identity for authentication |
| **Tap** | Real-time traffic observation |
| **Destination** | Service discovery and routing service |
| **Web** | Control plane web UI and API |
| **Admin** | Proxy admin interface |

### Data Models and Types

#### Service Profile Schema
```yaml
apiVersion: linkerd.io/v1alpha2
kind: ServiceProfile
metadata:
  name: service.namespace.svc.cluster.local
spec:
  routes:
    - name: string
      condition:
        method: GET
        pathRegex: string
      responseTimeout: 1s
      retryBudget:
        retryRatio: 0.2
        minRetriesPerSecond: 10
        ttl: 30s
  decisionTimeout: 100ms
```

#### Proxy Configuration
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: linkerd-proxy-config
data:
  config.yaml: |
    outbound:
      port: 4140
    inbound:
      port: 4143
    admin:
      port: 4191
```

### Lifecycle Management

#### Installation Lifecycle
1. **Prerequisites**: Kubernetes cluster, CLI installation
2. **Control plane install**: `linkerd install | kubectl apply -f -`
3. **Data plane injection**: Enable proxy injection
4. **Verification**: `linkerd check`
5. **Upgrade**: `linkerd upgrade | kubectl apply -f -`
6. **Uninstall**: `linkerd uninstall | kubectl delete -f -`

#### Proxy Lifecycle
1. **Injection**: Pod admission triggers proxy injection
2. **Startup**: Proxy initializes and connects to control plane
3. **Operation**: Intercepts traffic and collects metrics
4. **Rotation**: Certificates rotated automatically
5. **Shutdown**: Graceful connection drain on pod termination

### State Management

#### Control Plane State
- **Service registry**: Service discovery information
- **Identity keys**: CA keys for certificate signing
- **Policies**: Service profiles and authorization policies
- **Metrics**: Aggregated service metrics

#### Proxy State
- **Connection pool**: Active connections to services
- **TLS sessions**: mTLS session state
- **Rate limiting**: Current rate limit state
- **Circuit breaker**: Current circuit breaker state

## Scaling and Deployment Patterns

### Horizontal Scaling

#### Multiple Control Plane Replicas
```bash
# Scale control plane
kubectl scale -n linkerd deploy/linkerd-controller --replicas=3
```

#### Proxy Scalability
- **Per-pod proxy**: One proxy per application pod
- **Connection limits**: Configure based on traffic patterns
- **Memory limits**: Set appropriate limits for proxy containers

### High Availability

#### Control Plane Redundancy
- **Multiple replicas**: Run 3+ controller replicas
- **Pod anti-affinity**: Spread controllers across nodes
- **PVC for state**: Use persistent storage for state
- **Leader election**: Automatic leader selection

#### Proxy Resilience
- **Graceful shutdown**: Drain connections before termination
- **Health checks**: Kubernetes readiness/liveness probes
- **Circuit breaking**: Automatic failure isolation
- **Retry policies**: Configurable retry behavior

### Production Deployments

#### Multi-Cluster Mesh
```bash
# Create cross-cluster connection
linkerd multicluster link --cluster-name production cluster-1-linkerd-service

# Enable service discovery
linkerd multicluster enable --cluster-name production
```

#### Security Hardening
```bash
# Install with strict mTLS
linkerd install --identity-external-issuer=true | kubectl apply -f -

# Enable policy enforcement
linkerd policy install | kubectl apply -f -
```

### Upgrade Strategies

#### Rolling Upgrades
1. Upgrade control plane first
2. Verify control plane health
3. Proxy auto-updates on next restart
4. Roll pods to trigger proxy update

#### Blue-Green Upgrades
1. Deploy new mesh to secondary namespace
2. Gradually shift traffic
3. Verify stability
4. Complete migration

### Resource Management

#### Resource Sizing
```yaml
# Example resource configuration
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 256Mi
```

#### Cost Optimization
- **Connection pooling**: Reduce proxy overhead
- **Selective meshing**: Only mesh critical services
- **Resource limits**: Prevent resource abuse
- **Monitoring**: Track resource usage trends

## Additional Resources

### Official Documentation
- **Linkerd Documentation**: https://linkerd.io/
- **Linkerd GitHub**: https://github.com/linkerd/linkerd2
- **Linkerd CLI**: https://github.com/linkerd/linkerd2-cli
- **Service Profiles**: https://linkerd.io/2/reference/service-profiles/

### CNCF References
- **Linkerd in CNCF Landscape**: https://landscape.cncf.io/?group=projects&filter=service-mesh
- **Linkerd Project Page**: https://linkerd.io/

### Tools and Libraries
- **linkerd2 CLI**: Official command-line tool
- **linkerd2-proxy**: Rust-based proxy implementation
- **linkerd2-controller**: Go control plane implementation
- **linkerd2-web**: UI and API server
- **linkerd2-viz**: Observability extension

### Tutorials and Guides
- **Getting Started**: https://linkerd.io/get-started/
- **Service Profiles**: https://linkerd.io/2/tasks/using-service-profiles/
- **Traffic Split**: https://linkerd.io/2/tasks/using-traffic-split/
- **Multi-cluster**: https://linkerd.io/2/tasks/multicluster/

### Community Resources
- **Linkerd Slack**: https://slack.linkerd.io/
- **Linkerd Twitter**: https://twitter.com/linkerd
- **Stack Overflow**: https://stackoverflow.com/questions/tagged/linkerd
- **Blog**: https://linkerd.io/blog/

### Related Projects
- **Istio**: Full-featured service mesh
- **Envoy**: Proxy underlying Linkerd
- **OpenTelemetry**: Observability integration
- **Cert Manager**: Certificate management

### OpenTelemetry Integration
- **Distributed tracing**: Linkerd propagates trace context
- **Metrics collection**: Proxy exposes Prometheus metrics
- **Logs correlation**: Request IDs enable correlation
- **Custom metrics**: Application-specific metrics integration

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

## Examples

### Linkerd Service Profile Configuration


```yaml
# Linkerd ServiceProfile for HTTP services
apiVersion: linkerd.io/v1alpha2
kind: ServiceProfile
metadata:
  name: payments-api.production.svc.cluster.local
  namespace: production
spec:
  routes:
  - condition:
      method: GET
      pathRegex: /payments/(.+)/status
    name: GET Payments Status
    timeout: 500ms
  - condition:
      method: POST
      pathRegex: /payments
    name: POST Payments
    timeout: 10s
  - condition:
      method: DELETE
      pathRegex: /payments/(.+)
    name: DELETE Payments
    timeout: 5s
```

### Linkerd TrafficSplit Configuration


```yaml
# Linkerd TrafficSplit for canary deployments
apiVersion: linkerd.io/v1alpha2
kind: TrafficSplit
metadata:
  name: myapp-canary
  namespace: production
spec:
  backends:
  - service: myapp
    weight: 90
  - service: myapp-canary
    weight: 10
  service: myapp.production.svc.cluster.local
---
# Apply to existing service
apiVersion: v1
kind: Service
metadata:
  name: myapp
  namespace: production
spec:
  selector:
    app: myapp
  ports:
  - port: 80
    targetPort: 8080
```

### Linkerd Policy for mTLS


```yaml
# Linkerd policy for strict mTLS
apiVersion: policy.linkerd.io/v1beta1
kind: Server
metadata:
  name: myapp-server
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: myapp
  port: http
  policy:
    mtls:
      mode: strict

---
# ServerPolicy for multiple ports
apiVersion: policy.linkerd.io/v1beta1
kind: ServerPolicy
metadata:
  name: myapp-server-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: myapp
  policies:
  - name: http-server
    serverPorts:
    - 8080
    port: 8080
    protocol: http
  - name: grpc-server
    serverPorts:
    - 9090
    port: 9090
    protocol: grpc
```

## Tutorial

This tutorial will guide you through installing, configuring, and using Linkerd for lightweight service mesh management in Kubernetes.

### Prerequisites

Before beginning, ensure you have:
- A running Kubernetes cluster (minikube, kind, EKS, GKE, AKS)
- `kubectl` configured with cluster-admin permissions
- `linkerd` CLI installed
- Basic understanding of Kubernetes services and networking

Verify your setup:

```bash
# Check cluster connectivity
kubectl cluster-info

# Verify kubectl configuration
kubectl get nodes

# Check Linkerd CLI version (after installation)
linkerd version

# Verify cluster supports sidecar injection
kubectl get mutatingwebhookconfigurations
```

---

### 1. Installation

Linkerd can be installed using the official Linkerd CLI or Helm.

#### Method 1: Using Linkerd CLI (Recommended)

```bash
# Download and install Linkerd CLI
curl --proto '=https' --tlsv1.2 -sSfL https://linkerd.io/install | sh

# Add Linkerd to PATH
export PATH=$PATH:~/.linkerd2/bin

# Verify installation
linkerd version

# Or install via Homebrew (macOS/Linux)
brew install linkerd

# Or via Chocolatey (Windows)
choco install linkerd
```

#### Method 2: Install Linkerd Control Plane

```bash
# Validate prerequisites
linkerd check --pre

# Install Linkerd control plane
linkerd install | kubectl apply -f -

# Or install with custom configuration
linkerd install \
  --proxy-version stable-2.14.0 \
  --identity-external-issuer=true \
  --metrics-server-tls-auto | kubectl apply -f -

# Verify installation
linkerd check

# Check Linkerd pods
kubectl get pods -n linkerd
```

#### Method 3: Using Helm

```bash
# Add Linkerd Helm repository
helm repo add linkerd https://helm.linkerd.io/stable
helm repo update

# Install Linkerd control plane
helm install linkerd-control-plane linkerd/linkerd-control-plane \
  --namespace linkerd \
  --create-namespace \
  --wait

# Verify installation
helm list -n linkerd
kubectl get pods -n linkerd
```

#### Method 4: Install Linkerd Viz Extension

```bash
# Install Viz extension for observability
linkerd viz install | kubectl apply -f -

# Or using Helm
helm install linkerd-viz linkerd/linkerd-viz \
  --namespace linkerd-viz \
  --create-namespace \
  --wait

# Verify Viz installation
linkerd viz check
```

---

### 2. Basic Configuration

#### Enable Proxy Injection

```bash
# Enable injection on namespace
kubectl label namespace default linkerd.io/inject=enabled

# Or use label selector for specific namespaces
kubectl label namespace production linkerd.io/inject=enabled

# Verify injection is enabled
kubectl get namespace -L linkerd.io/inject

# Manually inject sidecar
kubectl get deployment myapp -o yaml | linkerd inject - | kubectl apply -f -
```

#### Configure Service Profiles

```yaml
# Create a ServiceProfile for HTTP services
cat <<EOF | kubectl apply -f -
apiVersion: linkerd.io/v1alpha2
kind: ServiceProfile
metadata:
  name: api-service.default.svc.cluster.local
  namespace: default
spec:
  routes:
  - condition:
      method: GET
      pathRegex: /api/users
    name: GET Users
    timeout: 500ms
    retries:
      budget:
        retryRatio: 0.1
        minRetriesPerSecond: 5
        ttl: 10s
  - condition:
      method: POST
      pathRegex: /api/users
    name: POST Users
    timeout: 2s
    retries:
      budget:
        retryRatio: 0.2
        minRetriesPerSecond: 10
        ttl: 10s
EOF
```

#### Configure mTLS Settings

```bash
# Verify mTLS is working
linkerd edges identity

# Check certificate status
linkerd identity

# View certificate details
linkerd -n linkerd identity service/linkerd-identity
```

#### Configure Traffic Policies

```yaml
# Create Server for mTLS
cat <<EOF | kubectl apply -f -
apiVersion: policy.linkerd.io/v1beta1
kind: Server
metadata:
  name: myapp-server
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: myapp
  port: http
  policy:
    mtls:
      mode: strict
EOF

# Create ServerPolicy for authorization
cat <<EOF | kubectl apply -f -
apiVersion: policy.linkerd.io/v1beta1
kind: ServerPolicy
metadata:
  name: myapp-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: myapp
  policies:
  - name: allow-frontend
    serverPorts:
    - 8080
    port: 8080
    protocol: http
    allowed:
    - namespaces:
      - frontend
EOF
```

---

### 3. Usage Examples

#### Deploying an Application with Linkerd

```bash
# Deploy sample application
kubectl apply -f https://raw.githubusercontent.com/linkerd/linkerd2/main/demo/nginx.yaml

# Enable mesh injection
kubectl get deployment nginx -o yaml | linkerd inject - | kubectl apply -f -

# Verify injection
kubectl get pods -o json | jq '.items[].spec.containers[].name' | grep linkerd-proxy

# Check proxy status
linkerd -n default proxies
```

#### Traffic Split for Canary Deployments

```bash
# Create traffic split
cat <<EOF | kubectl apply -f -
apiVersion: linkerd.io/v1alpha2
kind: TrafficSplit
metadata:
  name: myapp-split
  namespace: production
spec:
  backends:
  - service: myapp
    weight: 90
  - service: myapp-canary
    weight: 10
  service: myapp.production.svc.cluster.local
EOF

# Update traffic split
kubectl patch traficsplit myapp-split -p '{"spec":{"backends":[{"service":"myapp","weight":80},{"service":"myapp-canary","weight":20}]}}'

# Remove traffic split
kubectl delete traficsplit myapp-split
```

#### Using Linkerd CLI Commands

```bash
# View service list with health status
linkerd -n production services

# View pod list
linkerd -n default proxies

# View traffic summary
linkerd -n production stat deploy

# View specific service stats
linkerd -n production stat svc/api-service

# View top endpoints
linkerd -n production top pods
```

#### Observability with Linkerd Viz

```bash
# Access dashboard
linkerd viz dashboard &

# View traffic metrics
linkerd viz stat deploy -n production

# View top routes
linkerd viz top routes -n production

# View proxy logs
linkerd viz logs -n production deploy/myapp

# View tap for real-time traffic
linkerd tap deploy/myapp -n production

# View service profile
linkerd -n default sp get api-service
```

---

### 4. Common Operations

#### Monitoring Linkerd Health

```bash
# Check overall health
linkerd check

# Check specific components
linkerd check --proxy
linkerd check --pre

# View control plane status
kubectl get pods -n linkerd

# View proxy status
linkerd -n default proxies | head -20

# View certificate status
linkerd -n linkerd edges identity
```

#### Debugging Service Mesh

```bash
# View pod connectivity
linkerd -n default proxies

# View proxy configuration
linkerd -n default proxy-config deploy/myapp

# View proxy logs
linkerd -n default logs deploy/myapp -c linkerd-proxy

# View traffic tap
linkerd -n default tap deploy/myapp

# View edge connections
linkerd edges deploy/myapp
```

#### Managing Linkerd Updates

```bash
# Check for updates
linkerd upgrade --check

# Upgrade Linkerd
linkerd upgrade | kubectl apply -f -

# Verify upgrade
linkerd check

# Check proxy versions
linkerd -n default proxy-version

# Restart proxies to get new version
linkerd -n default restart deploy/*
```

#### Exporting Data

```bash
# Export metrics
linkerd -n linkerd metrics

# Export proxy configuration
linkerd -n default proxy-config deploy/myapp -o json

# Export logs
linkerd -n default logs -c linkerd-proxy deploy/myapp > proxy.log
```

---

### 5. Best Practices

#### Configuration Best Practices

1. **Enable Proxy Injection Selectively**: Only enable on namespaces that need it
2. **Set Resource Limits**: Configure CPU and memory limits for proxies
3. **Use Service Profiles**: Define service profiles for important services
4. **Configure Timeouts**: Set appropriate timeouts based on service SLAs
5. **Enable mTLS**: Always enable strict mTLS in production
6. **Monitor Resource Usage**: Track proxy CPU and memory usage
7. **Use Service Accounts**: Configure dedicated service accounts for proxies
8. **Enable Observability**: Install Viz extension for metrics and traces

#### Security Best Practices

1. **Rotate Certificates**: Regularly rotate identity certificates
2. **Enable Policy Enforcement**: Use Server and ServerPolicy resources
3. **Network Policies**: Combine with Kubernetes network policies
4. **Audit Logging**: Enable audit logging for security analysis
5. **Service Account Token Projection**: Use projected service account tokens
6. **Pod Security Standards**: Apply pod security standards
7. **Secrets Management**: Use external secret management for certificates
8. **Image Verification**: Use verified Linkerd images

#### Observability Best Practices

1. **Collect All Metrics**: Enable proxy metrics collection
2. **Set Up Alerts**: Configure alerts for high error rates and latency
3. **Create Dashboards**: Build Grafana dashboards for Linkerd metrics
4. **Distributed Tracing**: Integrate with Jaeger or Zipkin
5. **Service Graph**: Monitor service dependency graph
6. **Track SLOs**: Set up SLO-based alerting
7. **Log Aggregation**: Configure centralized logging
8. **Anomaly Detection**: Set up anomaly detection for traffic patterns

#### Performance Best Practices

1. **Optimize Proxy Resources**: Adjust proxy resource limits based on traffic
2. **Connection Pooling**: Enable connection pooling for HTTP/2
3. **Reduce Proxy Count**: Minimize hops through the mesh
4. **Use HTTP/2**: Prefer HTTP/2 over HTTP/1.1
5. **Configure Timeouts**: Set appropriate request timeouts
6. **Load Balancing**: Configure appropriate load balancing strategies
7. **Caching**: Enable response caching where appropriate
8. **Compression**: Enable request/response compression

*Content generated automatically. Verify against official documentation before production use.*

## Examples

