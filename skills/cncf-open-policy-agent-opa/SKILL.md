---
name: cncf-open-policy-agent-opa
description: Open Policy Agent in Security &amp; Compliance - cloud native architecture, patterns, pitfalls, and best practices
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: cncf
  role: reference
  scope: infrastructure
  output-format: manifests
  triggers: open policy agent opa, open-policy-agent-opa, security, compliance, cloud
---
# Open Policy Agent in Cloud-Native Engineering

## Purpose and Use Cases

### What Problem Does It Solve?
- **Policy as code for cloud-native**: Provides a unified policy engine for consistent policy enforcement across Kubernetes, microservices, and CI/CD pipelines
- **Declarative policy definition**: Write policies in Rego, a high-level declarative language that's easy to test and version control
- **Centralized policy management**: Single policy engine across multiple systems and services
- **Real-time policy evaluation**: Low-latency policy decisions with caching and efficient evaluation
- **Audit and compliance**: Track policy decisions for security audits and compliance reporting

### When to Use
- **Multi-cloud Kubernetes**: When you need consistent policies across multiple Kubernetes clusters
- **Fine-grained access control**: When RBAC isn't sufficient and you need complex authorization rules
- ** Admission control**: When you need to enforce policies on Kubernetes resource creation/modification
- **API security**: When you need to enforce security policies on microservice APIs
- **Infrastructure as Code validation**: When you need to validate Terraform, CloudFormation, or other IaC configurations

### Key Use Cases
- **Kubernetes admission control**: Enforce security policies on pod creation (run as non-root, restricted images, etc.)
- **Multi-tenant isolation**: Ensure tenants cannot access each other's resources
- **Regulatory compliance**: Enforce PCI-DSS, HIPAA, or GDPR requirements programmatically
- **Cost optimization**: Prevent expensive resource configurations from being deployed
- **Security hardening**: Enforce security best practices across the organization

## Architecture Design Patterns

### Core Components

#### OPA Daemon
```
opa
├── opa (policy evaluation engine)
├── discovery API (dynamic configuration)
├── status API (health and metrics)
├── decision logs (audit trail)
└── bundle server (policy distribution)
```
- **Policy engine**: Evaluates policies against input documents
- **Discovery service**: Dynamic configuration loading
- **Decision logging**: Records all policy decisions for auditing
- **Bundle server**: Distributes policy bundles to agents

#### Rego Policy Language
```rego
package kubernetes.admission

import input.request

# Deny pod creation if runAsNonRoot is not set
deny[msg] {
  input.request.kind.kind == "Pod"
  not request.object.spec.containers[_].securityContext.runAsNonRoot
  msg := "Pod containers must have runAsNonRoot: true"
}

# Allow only specific image registries
deny[msg] {
  input.request.kind.kind == "Pod"
  container := input.request.object.spec.containers[_]
  not startswith(container.image, "gcr.io/my-org/")
  msg := sprintf("Container image %v must be from trusted registry", [container.image])
}
```
- **Rego policy language**: Declarative policy language
- **Packages**: Organize policies into namespaces
- **Rules**: Define conditions and conclusions
- **Built-in functions**: Standard library for common operations

#### Decision API
```json
POST /v1/data/kubernetes/admission
Content-Type: application/json

{
  "input": {
    "request": {
      "kind": {"kind": "Pod"},
      "object": {"spec": {"containers": [{"image": "nginx"}]}}
    }
  }
}

Response:
{
  "result": [
    {
      "msg": "Pod containers must have runAsNonRoot: true"
    }
  ]
}
```

### Component Interactions
```
API Server (Kubernetes)
    ↓ (mutating/webhook)
OPA Agent/Server
    ↓ (policy evaluation)
OPA Engine
    ↓ (policy documents + input)
Rego Policy
    ↓ (decision)
API Server
    ↓ (admit/deny)
Application
```

### Data Flow Patterns

#### Kubernetes Admission Flow
```
1. User creates pod via kubectl
2. Kubernetes API server receives request
3. Mutating admission webhook intercepts request
4. Webhook calls OPA for policy evaluation
5. OPA evaluates policy against request
6. OPA returns allow/deny decision
7. API server acts on decision
8. Pod created or rejected
```

#### Standalone Evaluation Flow
```
1. Application receives request
2. Application calls OPA decision API
3. OPA loads relevant policy documents
4. OPA evaluates policy with request input
5. OPA returns decision
6. Application enforces decision
```

### Design Principles

#### Separation of Concerns
- **Policy**: Define what is allowed, not how to enforce
- **Enforcement**: Application logic implements policy decisions
- **Documents**: Data separate from policy logic

#### Declarative Policies
- **What vs how**: Define desired state, not implementation
- **Testable**: Policies can be unit tested independently
- **Readable**: Policies should read like English

#### Idempotency
- **Same input = same output**: Policy evaluation is deterministic
- **No side effects**: Policy evaluation doesn't modify state
- **Cacheable**: Results can be safely cached

## Integration Approaches

### Integration with Other CNCF Projects

#### Kubernetes Admission Controller
```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: opa-validating-webhook
webhooks:
  - name: validation.policy.openpolicyagent.org
    rules:
      - apiGroups: [""]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["pods"]
    clientConfig:
      service:
        name: opa
        namespace: opa
        path: /v1/data/kubernetes/admission
      caBundle: "..."
    admissionReviewVersions: ["v1", "v1beta1"]
    sideEffects: None
```
- **ValidatingWebhookConfiguration**: Kubernetes webhook pointing to OPA
- **Admission review**: OPA receives Kubernetes admission review requests
- **Policy enforcement**: OPA policies enforce organization policies

#### Kyverno Integration
```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-labels
spec:
  rules:
    - name: check-app-label
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        message: "The label 'app' is required"
        pattern:
          metadata:
            labels:
              app: "?*"
```
- **Kyverno**: Kubernetes-native policy engine
- **OPA**: Central policy engine for complex policies
- **Integration**: Use Kyverno for simple rules, OPA for complex logic

#### cert-manager Integration
```rego
package certmanager.validations

deny[msg] {
  input.request.kind.kind == "Certificate"
  not input.request.object.spec.issuerRef.name == "internal-issuer"
  msg := "Certificates must use internal issuer"
}
```
- **Certificate policies**: Enforce certificate issuance policies
- **Issuer restrictions**: Limit which issuers can be used
- **Certificate lifecycle**: Enforce certificate rotation policies

#### Tekton Integration
```yaml
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: deploy
spec:
  params:
    - name: opa-policy
      type: string
  tasks:
    - name: validate-opa
      taskRef:
        name: opa-validate
      params:
        - name: policy
          value: $(params.opa-policy)
        - name: input
          value: $(tasks.build-task.results.image)
```
- **CI/CD validation**: Validate pipeline configurations
- **Image policies**: Enforce container image policies
- **Deployment policies**: Validate deployment configurations

#### Flagger Integration
```rego
package flagger.canary

# Deny canary deployment if image is not from trusted registry
deny[msg] {
  input.canary.spec.template.spec.containers[_].image
  not startswith(input.canary.spec.template.spec.containers[_].image, "gcr.io/secure/")
  msg := "Canary deployments must use trusted registry images"
}
```
- **Canary policies**: Control canary deployment policies
- **Progression rules**: Enforce canary progression rules
- **Rollback conditions**: Define automatic rollback policies

### API Patterns

#### Decision API
- **POST /v1/data**: Evaluate policy with input
- **GET /v1/data**: Get policy information
- **DELETE /v1/data**: Remove cached decisions
- **Parameters**: Query parameters for fine-grained control

#### Management API
- **PUT /v1/policies**: Upload policy documents
- **DELETE /v1/policies**: Remove policy documents
- **GET /v1/policies**: List policy documents
- **Bundles**: Download policy bundles

#### Status API
- **GET /v1/status**: Get engine status
- **GET /v1/metrics**: Get Prometheus metrics
- **GET /v1/health**: Health check endpoint

### Configuration Patterns

#### OPA Configuration
```yaml
# opa.yaml
services:
  - name: kubernetes
    url: https://kubernetes.default.svc
    credentials:
      bearer_token:
        path: /var/run/secrets/kubernetes.io/serviceaccount/token

plugins:
  kubernetes:
    bundle:
      name: kubernetes/admission
      path: /v1/data/kubernetes/admission
    decision_logs:
      enable: true

services:
  - name: bundle-server
    url: https://bundle.example.com
    credentials:
      bearer_token:
        path: /var/run/secrets/bundle/token
```

#### Bundle Configuration
```yaml
# bundle.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: opa-bundle
  namespace: opa
data:
  policy.rego: |
    package kubernetes.admission
    # Policies here
  labels.json: |
    {
      "app": "opa-bundle",
      "version": "v1.0.0"
    }
```

### Extension Mechanisms

#### Custom Built-in Functions
```go
// Go implementation
func myCustomFunction(ctx context.Context, input []ast.Value) (ast.Value, error) {
    // Custom logic here
    return ast.Boolean(true), nil
}

// Register in OPA
opa.RegisterBuiltinFunction("mycustomfn", myCustomFunction, ast.TypeBoolean)
```

#### Decision Caching
```yaml
plugins:
  cache:
    default_ttl: "5m"
    max_size: 10000
```

## Common Pitfalls and How to Avoid Them

### Configuration Issues

#### Performance Bottlenecks
**Problem**: OPA evaluation slows down API requests.

**Solution**:
```yaml
# Enable caching
plugins:
  cache:
    default_ttl: "5m"

# Optimize policies
- Use efficient built-in functions
- Avoid deep recursion
- Use sets instead of arrays where possible
- Enable caching for repeated evaluations
```

#### Policy Loading Failures
**Problem**: Policies don't load or update.

**Solutions**:
```bash
# Check policy status
curl http://localhost:8181/v1/policies

# Check decision logs
curl http://localhost:8181/v1/history

# Verify configuration
kubectl logs -n opa deploy/opa
```

#### Bundle Versioning
**Problem**: Bundle updates cause inconsistencies.

**Solutions**:
- Use semantic versioning for bundles
- Implement gradual rollouts
- Test bundles in staging
- Use bundle signing for security

### Performance Issues

#### Slow Policy Evaluation
**Problem**: Policies take too long to evaluate.

**Solutions**:
- Profile policies with `opa eval --bundle`
- Use `opa bench` for performance testing
- Simplify complex policies
- Cache decision results
- Use efficient data structures (sets over arrays)

#### Memory Consumption
**Problem**: OPA uses excessive memory.

**Solutions**:
```yaml
# Limit memory usage
containers:
  - name: opa
    resources:
      limits:
        memory: "512Mi"
        cpu: "500m"
```

#### Network Latency
**Problem**: Remote policy evaluation adds latency.

**Solutions**:
- Use OPA as sidecar proxy
- Implement local caching
- Use decision caching
- Evaluate policies locally where possible

### Operational Challenges

#### Policy Debugging
**Problem**: Policy decisions are unclear.

**Solutions**:
```bash
# Trace policy evaluation
curl -X POST http://localhost:8181/v1/debug/trace \
  -H "Content-Type: application/json" \
  -d '{
    "input": {"request": {...}},
    "packages": ["kubernetes.admission"]
  }'

# Use OPA REPL for interactive testing
opa eval --bundle 'package test; p := true { input.x == 1 }' --input /dev/stdin <<< '{"x": 1}'
```

#### Policy Updates
**Problem**: Breaking changes in policy cause issues.

**Solutions**:
- Test policies before deployment
- Use policy versioning
- Deploy policy changes separately from application changes
- Implement policy rollback procedures
- Monitor policy decision logs

#### RBAC Complexity
**Problem**: Too many overlapping policies.

**Solutions**:
- Organize policies into clear packages
- Document policy ownership
- Use policy namespaces
- Implement policy reviews
- Audit policy conflicts regularly

### Security Pitfalls

#### Policy Injection
**Problem**: Malicious input bypasses policies.

**Solutions**:
- Validate all input data
- Use strict policy parameters
- Implement defense in depth
- Audit policy input sources
- Use signed policies where possible

#### Policy Disclosure
**Problem**: Policies泄露 sensitive information.

**Solutions**:
- Separate policies from sensitive data
- Use environment variables for secrets
- Encrypt policy documents at rest
- Audit policy access
- Use RBAC for policy access

#### Decision Log Exposure
**Problem**: Decision logs contain sensitive information.

**Solutions**:
- Redact sensitive data from logs
- Encrypt decision logs
- Limit decision log access
- Implement log rotation
- Use secure storage for logs

## Coding Practices

### Idiomatic Configuration

#### Kubernetes Policy Structure
```rego
# kubernetes/admission.rego
package kubernetes.admission

import input.request

# Default deny
default allow = false

# Allow if not denied
allow {
  not deny
}

# Deny rules
deny[msg] {
  # Security policies
  # Compliance policies
  # Cost policies
}
```

### API Usage Patterns

#### Policy Evaluation
```bash
# Evaluate policy with input
curl -X POST http://localhost:8181/v1/data/kubernetes/admission \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "request": {
        "kind": {"kind": "Pod"},
        "object": {"spec": {"containers": [{"image": "nginx", "securityContext": {"runAsNonRoot": true}}]}}
      }
    }
  }'
```

#### Policy Upload
```bash
# Upload policy
curl -X PUT http://localhost:8181/v1/policies/my-policy \
  -H "Content-Type: text/plain" \
  -d @policy.rego
```

### Observability Best Practices

#### Metrics Collection
- **Policy evaluation time**: Track policy evaluation latency
- **Decision cache hit ratio**: Monitor cache effectiveness
- **Policy compilation time**: Track policy compilation duration
- **Memory usage**: Monitor OPA memory consumption

#### Logging Strategy
- **Decision logs**: Record all policy decisions
- **Error logs**: Log policy evaluation errors
- **Audit logs**: Track who changed what policies
- **Access logs**: Log who accessed policies

### Development Workflow

#### Policy Development
1. Develop policies locally with OPA REPL
2. Write unit tests with OPA test framework
3. Test against sample inputs
4. Deploy to staging environment
5. Review policy changes
6. Deploy to production with gradual rollouts

#### CI/CD Integration
```yaml
# GitHub Actions example
- name: Run OPA Tests
  run: opa test policy/*.rego -v

- name: Policy Linting
  run: opa check policy/*.rego

- name: Build and Push Bundle
  run: |
    opa build -e kubernetes/admission policy -o bundle.tar.gz
    # Upload bundle to storage
```

## Fundamentals

### Essential Concepts

#### Rego Language
- **Packages**: Organize policies into namespaces
- **Rules**: Define conditions and conclusions
- **Built-in Functions**: Standard library for common operations
- **Variables**: Bind values for reuse
- **Comprehensions**: Generate collections

#### Policy Evaluation
- **Input document**: Request data passed to policy
- **Policy documents**: Rego policy files
- **Decision**: Allow/deny or other decisions
- **Context**: Execution context for evaluation

### Terminology Glossary

| Term | Definition |
|------|------------|
| **Rego** | Declarative policy language for OPA |
| **Bundle** | Package of policies and data files |
| **Decision API** | HTTP API for policy evaluation |
| **Admission Controller** | Kubernetes webhook for policy enforcement |
| **Document** | JSON/YAML data used by policies |
| **Rule** | Logic that evaluates to true/false |
| **Package** | Namespace for organizing policies |
| **Built-in** | Function provided by OPA |
| **Input** | Data passed to policy for evaluation |
| **Cache** | Cached policy decisions for performance |

### Data Models and Types

#### Rego Types
- **Boolean**: true/false
- **Number**: Integers and floats
- **String**: Text values
- **Array**: Ordered sequences
- **Set**: Unordered unique collections
- **Object**: Key-value pairs
- **Null**: Absence of value

#### Input Document Format
```json
{
  "request": {
    "kind": {"group": "", "version": "v1", "kind": "Pod"},
    "namespace": "default",
    "name": "my-pod",
    "operation": "CREATE",
    "user": {"username": "admin"},
    "object": {"spec": {...}},
    "oldObject": null
  }
}
```

### Lifecycle Management

#### Policy Lifecycle
1. **Development**: Write and test policies locally
2. **Testing**: Validate against test cases
3. **Review**: Code review for policy changes
4. **Deployment**: Upload to OPA
5. **Monitoring**: Monitor policy decisions
6. **Deprecation**: Remove outdated policies

#### OPA Lifecycle
1. **Installation**: Deploy OPA server or sidecar
2. **Configuration**: Configure policies and data
3. **Operation**: Run policy evaluations
4. **Upgrade**: Update OPA version
5. **Decommission**: Remove OPA from environment

### State Management

#### Policy State
- **Loaded policies**: Current policy documents in memory
- **Cached decisions**: Cached evaluation results
- **Bundles**: Downloaded policy bundles
- **Status**: Current operational status

#### Application State
- **Input data**: Request data for evaluation
- **Results**: Policy evaluation results
- **Logs**: Decision logs and error logs
- **Metrics**: Performance and operational metrics

## Scaling and Deployment Patterns

### Horizontal Scaling

#### OPA Server Cluster
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: opa
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: opa
          args:
            - "run"
            - "--server"
            - "--bundle=/bundles"
            - "--addr=localhost:8181"
```

#### Sidecar Pattern
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      containers:
        - name: my-app
          image: my-app:latest
        - name: opa
          image: openpolicyagent/opa:latest
          args:
            - "run"
            - "--service=opa"
            - "--addr=localhost:8181"
```

### High Availability

#### Multi-Region OPA
- **Active-active**: Deploy OPA in multiple regions
- **Load balancing**: Distribute requests across regions
- **Failover**: Automatic failover between regions
- **Consistency**: Synchronize policy bundles across regions

### Production Deployments

#### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: opa
  namespace: opa
spec:
  replicas: 3
  selector:
    matchLabels:
      app: opa
  template:
    metadata:
      labels:
        app: opa
    spec:
      serviceAccountName: opa
      containers:
        - name: opa
          image: openpolicyagent/opa:latest
          args:
            - "run"
            - "--server"
            - "--bundle=/bundles"
            - "--addr=localhost:8181"
            - "--log-level=info"
          ports:
            - containerPort: 8181
              name: http
          volumeMounts:
            - name: bundles
              mountPath: /bundles
              readOnly: true
          resources:
            requests:
              memory: "256Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
```

### Upgrade Strategies

#### Rolling Updates
1. Deploy new OPA version
2. Monitor for issues
3. Gradually replace old pods
4. Verify functionality
5. Remove old pods

### Resource Management

#### Resource Sizing
```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

#### Memory Optimization
- **Policy caching**: Cache policy decisions
- **Bundle optimization**: Minimize bundle size
- **Memory limits**: Set appropriate limits
- **Garbage collection**: Monitor and tune GC

## Additional Resources

### Official Documentation
- **OPA Documentation**: https://www.openpolicyagent.org/
- **Rego Language**: https://www.openpolicyagent.org/docs/latest/policy-reference/
- **Kubernetes Admission**: https://www.openpolicyagent.org/docs/latest/kubernetes-admission-control/
- **Bundle Management**: https://www.openpolicyagent.org/docs/latest/bundle/

### CNCF References
- **OPA in CNCF Landscape**: https://landscape.cncf.io/?group=projects&filter=policy
- **OPA Project Page**: https://openpolicyagent.org/

### Tools and Libraries
- **OPA CLI**: Command-line interface
- **OPA SDKs**: SDKs for Go, Java, Python, etc.
- **Rego linter**: Rego linting and formatting
- **OPA test**: Policy testing framework

### Tutorials and Guides
- **Getting Started**: https://www.openpolicyagent.org/docs/latest/get-started/
- **Kubernetes Tutorial**: https://www.openpolicyagent.org/docs/latest/kubernetes-tutorial/
- **Rego Playground**: https://play.openpolicyagent.org/

### Community Resources
- **OPA Slack**: https://play.openpolicyagent.org/
- **OPA Twitter**: https://twitter.com/openpolicyagent
- **Stack Overflow**: https://stackoverflow.com/questions/tagged/open-policy-agent
- **Blog**: https://www.openpolicyagent.org/blog/

### Related Standards
- **Kubernetes RBAC**: Role-based access control
- **ABAC**: Attribute-based access control
- **OAuth2**: Authorization framework

### OpenTelemetry Integration
- **Tracing**: Policy evaluation tracing
- **Metrics**: Prometheus metrics collection
- **Logs**: Policy decision logging
- **Distributed tracing**: Context propagation

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

