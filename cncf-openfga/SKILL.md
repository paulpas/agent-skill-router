---
name: cncf-openfga
description: OpenFGA in Security &amp; Compliance - cloud native architecture, patterns, pitfalls, and best practices
---
# OpenFGA in Cloud-Native Engineering

## Purpose and Use Cases

### What Problem Does It Solve?
- **Fine-grained authorization**: Enables applications to define and enforce fine-grained access control policies
- **Authorization as a service**: Provides a dedicated authorization engine with low-latency policy evaluation
- **Declarative authorization models**: Define authorization using relationships and tuples
- **Audit and compliance**: Track authorization decisions for security audits
- **Developer productivity**: Eliminates authorization complexity in application code

### When to Use
- **Complex authorization requirements**: When RBAC is insufficient and you need relationship-based access control
- **Multi-tenant applications**: When you need to enforce access control across multiple tenants
- **Resource hierarchy**: When you need to model resource hierarchies and inheritance
- **Frequent authorization changes**: When authorization policies change frequently and need to be versioned
- **High-scale authorization**: When you need to handle thousands of authorization requests per second

### Key Use Cases
- **Permission systems**: Define who can access what resources
- **Role hierarchies**: Implement role inheritance and nested roles
- **Team-based access**: Control access based on team membership
- **Audit logging**: Track who accessed what and when
- **API security**: Protect APIs with fine-grained authorization

## Architecture Design Patterns

### Core Components

#### OpenFGA Server
```
openfga
├── server (HTTP/gRPC API)
├── storage (data store)
├── cache (decision caching)
├── analyzer (authorization analysis)
└── logger (decision logging)
```
- **Server**: HTTP/gRPC API for authorization operations
- **Storage**: Data store for authorization model and tuples
- **Cache**: Decision caching for performance
- **Analyzer**: Authorization analysis and debugging
- **Logger**: Authorization decision logging

#### Authorization Model (OpenFGA Model)
```
type user
  define viewer: [user]
  define editor: [user] or viewer
  define admin: [user] or editor

type document
  define viewer: [user]
  define editor: [user] or viewer
  define admin: [user] or editor
  define can_view: viewer or editor
```
- **Type definitions**: Define authorization types
- **Relation definitions**: Define relationships between types
- **Computed relationships**: Define derived relationships

#### Tuple Store
```
# Authorization tuples
(user:alice, viewer, document:doc1)
(user:bob, editor, document:doc2)
(user:charlie, admin, document:doc1)
```
- **User**: Subject making the request
- **Relation**: Relationship being checked
- **Object**: Object being accessed

### Component Interactions
```
Application
    ↓ (Check API)
OpenFGA Server
    ↓ (Load model + tuples)
Storage
    ↓ (Evaluate)
Decision
    ↓ (Allow/Deny)
Application
```

### Data Flow Patterns

#### Authorization Check Flow
```
1. Application receives request
2. Application calls OpenFGA Check API
3. OpenFGA loads authorization model
4. OpenFGA loads relevant tuples
5. OpenFGA evaluates authorization
6. OpenFGA returns allow/deny
7. Application enforces decision
```

#### Batch Authorization Flow
```
1. Application collects multiple checks
2. Application calls OpenFGA CheckMultiple API
3. OpenFGA evaluates all checks
4. OpenFGA returns batch results
5. Application processes batch results
```

### Design Principles

#### Relationship-based Authorization
- **What vs how**: Define relationships, not authorization logic
- **Reusability**: Relationship definitions can be reused
- **Maintainability**: Authorization changes don't require code changes

#### Declarative Models
- **Versioned models**: Models are versioned and immutable
- **Testable models**: Models can be unit tested
- **Readable models**: Models should read like English

#### High Performance
- **Efficient evaluation**: Optimized for fast decision making
- **Caching**: Cache decisions for performance
- **Batch operations**: Support batch authorization checks

## Integration Approaches

### Integration with Other CNCF Projects

#### Kubernetes Integration
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: openfga-authorization
data:
  model.fga: |
    type user
    type document
      relation viewer: [user]
      relation editor: [user]
      define can_view: viewer or editor
```
- **Model stored as ConfigMap**: Authorization model as Kubernetes resource
- **Dynamic updates**: Update model without application restart
- **RBAC integration**: Use Kubernetes RBAC for OpenFGA access

#### Istio Integration
```yaml
apiVersion: networking.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: document-access
spec:
  action: CUSTOM
  provider:
    name: openfga
  rules:
    - to:
        - operation:
            paths: ["/documents/*"]
```
- **Istio authorization**: Use OpenFGA for Istio authorization
- **Service-to-service**: Enforce authorization between services
- **API protection**: Protect services with fine-grained authorization

#### OPA Integration
```rego
package istio.authorization

import input.request

# Check with OpenFGA
allow {
  http_send({
    "method": "POST",
    "url": "http://openfga:8080/check",
    "headers": [{"key": "Content-Type", "value": "application/json"}],
    "body": json.marshal({
      "tuple_key": {
        "user": sprintf("user:%s", [request.header["x-user-id"]]),
        "relation": "viewer",
        "object": sprintf("document:%s", [input.path[1]])
      }
    })
  }).status == 200
}
```
- **OPA + OpenFGA**: Combine OPA and OpenFGA for comprehensive policies
- **Policy composition**: Use OpenFGA for authorization, OPA for other policies

#### Kyverno Integration
```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: enforce-openfga
spec:
  validationFailureAction: Enforce
  rules:
    - name: check-authorization
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        message: "Pod creation requires OpenFGA authorization"
        deny: {}
```
- **Admission control**: Enforce OpenFGA authorization
- **Policy enforcement**: Block unauthorized resource creation
- **Automated checks**: Automatically check OpenFGA before allowing

### API Patterns

#### Check API
```json
POST /stores/{store_id}/check
Content-Type: application/json

{
  "tuple_key": {
    "user": "user:alice",
    "relation": "viewer",
    "object": "document:doc1"
  }
}

Response:
{
  "allowed": true,
  "resolution": "Direct"
}
```
- **tuple_key**: The relationship being checked
- **allowed**: Whether the relationship exists
- **resolution**: How the decision was made

#### ListObjects API
```json
POST /stores/{store_id}/list-objects
Content-Type: application/json

{
  "type": "document",
  "relation": "viewer",
  "user": "user:alice"
}

Response:
{
  "objects": ["document:doc1", "document:doc2"]
}
```
- **type**: Object type to list
- **relation**: Relationship to check
- **user**: User to check for
- **objects**: List of matching objects

#### ListRelations API
```json
POST /stores/{store_id}/list-relations
Content-Type: application/json

{
  "object": "document:doc1",
  "user": "user:alice",
  "relations": ["viewer", "editor", "admin"]
}

Response:
{
  "relations": ["viewer", "admin"]
}
```
- **object**: Object to check
- **user**: User to check for
- **relations**: List of relations to check
- **relations**: List of matching relations

### Configuration Patterns

#### OpenFGA Server Configuration
```yaml
# OpenFGA config
store:
  driver: postgres
  postgres:
    conn_str: "postgresql://user:pass@localhost:5432/openfga?sslmode=disable"
    max_open_conns: 10
    max_idle_conns: 10

server:
  grpc:
    addr: "0.0.0.0:8081"
  http:
    addr: "0.0.0.0:8080"
    tls:
      enabled: true

logger:
  format: "json"
  level: "info"

metrics:
  enabled: true
  address: "0.0.0.0:9090"
```

#### Model Versioning
```bash
# Create new model version
openfga models write --store-id=<id> --model=model.json

# Query model
openfga models read --store-id=<id>
```

### Extension Mechanisms

#### Custom Storage Backend
```go
// Implement Storage interface
type CustomStorage struct {
    // Custom storage implementation
}

func (s *CustomStorage) FindTuples(ctx context.Context, key storage.TupleKey) ([]*openfgav1.Tuple, error) {
    // Implement tuple finding
}

func (s *CustomStorage) WriteTuples(ctx context.Context, store string, mutations []*openfgav1.TupleMutation) error {
    // Implement tuple writes
}
```

#### Decision Caching
```yaml
cache:
  enabled: true
  ttl: "5m"
  max_size: 10000
```

## Common Pitfalls and How to Avoid Them

### Configuration Issues

#### Model Complexity
**Problem**: Authorization models become too complex and hard to maintain.

**Solution**:
- Break models into reusable components
- Use relationships instead of rules
- Document model design decisions
- Test models with OpenFGA analyzer

#### Performance Bottlenecks
**Problem**: Authorization checks are slow.

**Solutions**:
```bash
# Profile authorization checks
openfga analyze --store-id=<id> --model=model.json --tuple=user:alice,viewer,document:doc1

# Use caching
cache:
  enabled: true
  ttl: "5m"
```

#### Data Store Issues
**Problem**: Storage backend becomes bottleneck.

**Solutions**:
- Use connection pooling
- Implement read replicas
- Use in-memory cache
- Monitor storage performance

### Performance Issues

#### High Latency
**Problem**: Authorization checks add latency to requests.

**Solutions**:
- Cache decisions
- Batch authorization checks
- Use async authorization
- Implement local authorization for simple cases

#### Scalability Issues
**Problem**: Cannot handle required request volume.

**Solutions**:
- Scale horizontally
- Implement caching layers
- Use efficient data structures
- Optimize storage queries

### Operational Challenges

#### Model Updates
**Problem**: Model updates cause consistency issues.

**Solutions**:
- Version models
- Test model changes
- Use gradual rollouts
- Monitor for issues after updates

#### Debugging Authorization
**Problem**: Difficult to debug authorization decisions.

**Solutions**:
```bash
# Use analyze command
openfga analyze --store-id=<id> --model=model.json --tuple=user:alice,viewer,document:doc1

# Use trace command
openfga trace --store-id=<id> --model=model.json --tuple=user:alice,viewer,document:doc1
```

#### Data Migration
**Problem**: Data migration between versions.

**Solutions**:
- Test migrations in staging
- Implement migration scripts
- Keep old and new versions compatible
- Monitor migration progress

### Security Pitfalls

#### Overly Permissive Models
**Problem**: Models allow more access than intended.

**Solutions**:
- Follow principle of least privilege
- Review models regularly
- Use audit logging
- Test models thoroughly

#### Secret Exposure
**Problem**: Authorization data exposed in logs.

**Solutions**:
- Redact sensitive data from logs
- Encrypt authorization data
- Use secure logging
- Audit log access

#### Injection Attacks
**Problem**: Malicious input bypasses authorization.

**Solutions**:
- Validate all input
- Use parameterized queries
- Implement input sanitization
- Audit authorization input

## Coding Practices

### Idiomatic Configuration

#### Standard Model Structure
```fga
# type definitions
type user
type group
  relation member: [user, group#member]
  define viewer: [user] or member
type document
  relation viewer: [user, group#viewer]
  relation editor: [user, group#editor]
  define can_view: viewer or editor
```

### API Usage Patterns

#### Checking Authorization
```bash
# Check if user has access
openfga check --store-id=<id> --model=model.json \
  --tuple="user:alice,viewer,document:doc1"
```

#### Managing Tuples
```bash
# Write tuples
openfga write-tuples --store-id=<id> \
  --tuple="user:alice,viewer,document:doc1"

# Delete tuples
openfga delete-tuples --store-id=<id> \
  --tuple="user:alice,viewer,document:doc1"
```

### Observability Best Practices

#### Metrics Collection
- **Authorization requests**: Count authorization requests
- **Decision latency**: Track authorization check latency
- **Cache hit ratio**: Monitor cache effectiveness
- **Storage queries**: Track storage query performance

#### Logging Strategy
- **Decision logs**: Record all authorization decisions
- **Error logs**: Log authorization errors
- **Audit logs**: Track who changed what models
- **Access logs**: Log authorization access patterns

### Development Workflow

#### Model Development
1. Define authorization model
2. Write authorization tuples
3. Test with OpenFGA CLI
4. Verify with OpenFGA analyzer
5. Deploy to staging
6. Test in production with shadow mode
7. Enable in production

#### CI/CD Integration
```yaml
# GitHub Actions example
- name: Validate Model
  run: openfga validate --model=model.fga

- name: Test Authorization
  run: openfga test --model=model.fga

- name: Deploy Model
  run: openfga models write --store-id=$OPENFGA_STORE_ID --model=model.fga
```

## Fundamentals

### Essential Concepts

#### Authorization Model
- **Types**: Define authorization types (user, document, etc.)
- **Relations**: Define relationships between types
- **Computed Relationships**: Define derived relationships
- **Tuples**: Store authorization relationships

#### Tuple-Based Authorization
- **User**: Subject making the request
- **Relation**: Relationship being checked
- **Object**: Object being accessed
- **Tuple**: Tuple of (user, relation, object)

### Terminology Glossary

| Term | Definition |
|------|------------|
| **FGA** | Fine-grained authorization |
| **Model** | Authorization model definition |
| **Tuple** | Authorization relationship (user, relation, object) |
| **Store** | Container for models and tuples |
| **Check** | Query to check authorization |
| **Write** | Operation to add tuples |
| **Delete** | Operation to remove tuples |
| **Analyzer** | Tool for analyzing authorization models |
| **Trace** | Tool for tracing authorization decisions |
| **Relationship** | Connection between users and objects |

### Data Models and Types

#### Model Schema
```json
{
  "schema_version": "1.1",
  "type_definitions": [
    {
      "type": "document",
      "relations": {
        "viewer": {
          "union": {
            "child": [
              { "this": {} },
              { "computedUserset": { "relation": "editor" } }
            ]
          }
        },
        "editor": { "this": {} }
      }
    }
  ]
}
```

#### Tuple Schema
```json
{
  "tuple_key": {
    "user": "user:alice",
    "relation": "viewer",
    "object": "document:doc1"
  }
}
```

### Lifecycle Management

#### Model Lifecycle
1. **Design**: Design authorization model
2. **Write**: Write model to OpenFGA
3. **Test**: Test model with sample data
4. **Deploy**: Deploy to production
5. **Monitor**: Monitor authorization decisions
6. **Update**: Update model as needed

#### Tuple Lifecycle
1. **Create**: Write authorization tuples
2. **Query**: Query tuples for authorization
3. **Update**: Update tuples as permissions change
4. **Delete**: Remove tuples when no longer needed

### State Management

#### Model State
- **Loaded models**: Current authorization models
- **Tuples**: Stored authorization tuples
- **Cache**: Cached authorization decisions
- **Logs**: Authorization decision logs

#### Application State
- **Authorization tokens**: User authorization context
- **Cached results**: Cached authorization results
- **Session data**: Session-specific authorization
- **Audit data**: Authorization audit trail

## Scaling and Deployment Patterns

### Horizontal Scaling

#### Multiple OpenFGA Instances
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: openfga
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: openfga
          image: openfga/openfga:latest
```

#### Load Balancing
- **HTTP load balancing**: Distribute requests across instances
- **Consistent hashing**: Hash store IDs for consistency
- **Session affinity**: Maintain session for updates

### High Availability

#### Multi-Region Deployment
- **Active-active**: Deploy in multiple regions
- **Failover**: Automatic failover between regions
- **Consistency**: Synchronize data across regions

### Production Deployments

#### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: openfga
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: openfga
          image: openfga/openfga:latest
          ports:
            - containerPort: 8080
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
1. Deploy new version
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
- **Efficient data structures**: Use optimized storage
- **Caching**: Cache decisions
- **Connection pooling**: Use connection pooling
- **Garbage collection**: Monitor GC

## Additional Resources

### Official Documentation
- **OpenFGA Documentation**: https://openfga.dev/
- **FGA Language**: https://openfga.dev/docs/policy-language
- **API Reference**: https://openfga.dev/docs/api/overview
- **CLI Reference**: https://openfga.dev/docs/cli/

### CNCF References
- **OpenFGA in CNCF Landscape**: https://landscape.cncf.io/?group=projects&filter=authorization
- **CNCF Auth SIG**: https://github.com/cncf/sig-auth

### Tools and Libraries
- **OpenFGA CLI**: Command-line interface
- **OpenFGA SDKs**: SDKs for Go, Java, Python, etc.
- **Fga CLI**: FGA language CLI
- **OpenFGA Playground**: https://play.fga.dev/

### Tutorials and Guides
- **Getting Started**: https://openfga.dev/docs/getting-started/
- **Authorization Models**: https://openfga.dev/docs/modeling/
- **API Tutorial**: https://openfga.dev/docs/api/

### Community Resources
- **OpenFGA Slack**: https://fga.dev/community-slack
- **OpenFGA Twitter**: https://twitter.com/openfga
- **Stack Overflow**: https://stackoverflow.com/questions/tagged/openfga
- **Blog**: https://openfga.dev/blog/

### Related Standards
- **OAuth2**: Authorization framework
- **ABAC**: Attribute-based access control
- **Zanzibar**: Google's authorization model

### OpenTelemetry Integration
- **Tracing**: Authorization decision tracing
- **Metrics**: Prometheus metrics collection
- **Logs**: Authorization decision logging
- **Context propagation**: Authorization context

## Examples

### Basic Configuration

The typical configuration pattern for cncf-openfga follows standard CNCF practices:

```yaml
# Example configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: cncf-openfga-config
data:
  # Configuration goes here
  config.yaml: |
    # Base configuration
```

### Common Workflows

1. **Installation**: Use official documentation for platform-specific installation
2. **Configuration**: Configure via ConfigMaps or Helm values
3. **Scaling**: Scale based on workload requirements

### Advanced Features

- Feature-rich configuration options
- Integration with Kubernetes ecosystem
- Production-grade deployment patterns

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