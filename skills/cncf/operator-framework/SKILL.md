---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: '"Operator Framework in Tools to build and manage Kubernetes operators"
  with standardized patterns'
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: manifests
  role: reference
  scope: infrastructure
  triggers: build, manage, operator framework, operator-framework, tools
  archetypes:
  - educational
  - strategic
  anti_triggers:
  - brainstorming
  - vague ideation
  - non-containerized architecture
  response_profile:
    verbosity: medium
    directive_strength: low
    abstraction_level: strategic
  version: 1.0.0
name: framework
------
  related-skills: cncf-argo, cncf-artifact-hub, cncf-aws-eks, cncf-azure-aks


# Operator Framework in Cloud-Native Engineering

**Category:** Application Management  
**Status:** Active  
**Stars:** 2,400  
**Last Updated:** 2026-04-22  
**Primary Language:** Go  
**Documentation:** [Tools to build and manage Kubernetes operators with standardized patterns](https://operatorframework.io/docs/)  

---

## Purpose and Use Cases

Operator Framework is a core component of the cloud-native ecosystem, serving as standardized patterns

### What Problem Does It Solve?

Operator Framework addresses the challenge of creating and managing Kubernetes operators with consistent patterns. It provides standardized operator lifecycle, automated upgrades, and operational best practices.

### When to Use This Project

Use Operator Framework when building custom operators, managing stateful applications, or requiring complex application lifecycle management. Not ideal for simple deployments or when need automated operations for applications, manage complex stateful workloads, or require lifecycle automation.

### Key Use Cases

- Database Operators for Kubernetes
- Logging Stack Operators
- Service Mesh Operators
- Machine Learning Operators
- Custom Application Operators

---

## Architecture Design Patterns

### Core Components

- **OLM**: Operator Lifecycle Manager for deployment
- **CSV**: ClusterServiceVersion for operator metadata
- **Bundle**: Operator package format
- **Catalog Source**: Repository of operators
- **Operator Lifecycle Controller**: Manages operator lifecycle

### Component Interactions

1. **Bundle → Catalog**: Bundle added to operator catalog
1. **OLM → Catalog**: OLM fetches operator metadata
1. **OLM → Operator**: OLM deploys operator
1. **Operator → Application**: Operator manages application

### Data Flow Patterns

1. **Bundle Creation**: Operator code → CSV → Bundle → Catalog
1. **Deployment**: OLM reads catalog → Creates installation plan → Deploys operator
1. **Upgrade**: New CSV detected → Installation plan → Upgrade operator
1. **Status Sync**: Operator status → OLM → Displayed in console

### Design Principles

- **Lifecycle Management**: Automated installation and upgrades
- **Dependency Resolution**: Automatic handling of dependencies
- **Declarative Installation**: Install plans as YAML
- **Upgrade Safety**: Safe, staged upgrades

---

## Integration Approaches

### Integration with Other CNCF Projects

- **Kubernetes**: Core platform for operator execution
- **Helm**: Helm chart support for operators
- **Prometheus**: Metrics collection
- **OpenShift**: Integrated operator management

### API Patterns

- **CRDs**: Define custom resources for operator
- **API Groups**: Versioned API groups
- **Subscriptions**: Operator subscription management
- **InstallPlans**: Automatic installation plans

### Configuration Patterns

- **Bundle YAML**: Operator package format
- **CatalogSource YAML**: Catalog configuration
- **Subscription YAML**: Operator subscription
- **Helm Chart**: Helm-based operator packaging

### Extension Mechanisms

- **Custom Managers**: Manage additional APIs
- **Webhook Injection**: Add admission webhooks
- **Metrics Export**: Custom metric exports

---

## Common Pitfalls and How to Avoid Them

### Misconfigurations

- **Bundle Validation**: Bundle not passing validation
  - **How to Avoid**: Use operator-sdk bundle validate, check manifest requirements
- **Upgrade Blocking**: Upgrade blocked by validation
  - **How to Avoid**: Review upgrade path, fix validation issues

### Performance Issues

- **RBAC Issues**: Insufficient permissions for operator
  - **How to Avoid**: Review ClusterRoles, use least privilege
- **Operator State**: Operator in failed state
  - **How to Avoid**: Review operator logs, check CR status

### Operational Challenges

- **Dependency Resolution**: Dependencies not resolved
  - **How to Avoid**: Define operator dependencies clearly
- **CR Migration**: CR migration issues during upgrade
  - **How to Avoid**: Implement CRD migration strategy

### Security Pitfalls


---

## Coding Practices

### Idiomatic Configuration

- **Declarative Design**: Operator should be declarative
- **Idempotent Operations**: Operations should be idempotent
- **Status Management**: Keep CR status updated

### API Usage Patterns

- **operator-sdk**: CLI for operator development
- **kubectl apply**: Apply operator manifests
- **operator-sdk build**: Build operator image
- **operator-sdk scorecard**: Run scorecard tests

### Observability Best Practices

- **Operator Metrics**: Expose operator health metrics
- **CR Metrics**: Expose application metrics
- **Upgrade Metrics**: Track upgrade status

### Testing Strategies

- **Scorecard Tests**: Run scorecard test suite
- **Integration Tests**: Test operator functionality
- **Upgrade Tests**: Test upgrade paths

### Development Workflow

- **Local Development**: Use operator-sdk for development
- **Debug Commands**: Check operator and CR status
- **Test Environment**: Set up test cluster
- **CI/CD Integration**: Automate testing
- **Monitoring Setup**: Configure operator metrics
- **Documentation**: Maintain operator docs

---

## Fundamentals

### Essential Concepts

- **CSV**: ClusterServiceVersion
- **Bundle**: Operator package
- **CatalogSource**: Operator repository
- **Subscription**: Operator subscription
- **InstallPlan**: Installation plan
- **OperatorGroup**: Operator scope
- **APIService**: API service registration
- **Webhook**: Admission webhook

### Terminology Glossary

- **OLM**: Operator Lifecycle Manager
- **CSV**: ClusterServiceVersion
- **CRD**: Custom Resource Definition
- **Bundle**: Operator package
- **Catalog**: Operator repository

### Data Models and Types

- **ClusterServiceVersion**: Operator metadata
- **CustomResourceDefinition**: CRD schema
- **Subscription**: Operator subscription
- **InstallPlan**: Installation plan

### Lifecycle Management

- **Bundle Creation**: Write operator → Create bundle → Push to catalog
- **Operator Installation**: Create subscription → OLM createsInstallPlan → Operator deployed
- **Operator Upgrade**: New CSV available → OLM creates new InstallPlan → Upgrade operator
- **Operator Removal**: Delete subscription → Operator undeployed

### State Management

- **Bundle State**: Valid, invalid, or pending
- **Subscription State**: Installed, failed, or upgrading
- **InstallPlan State**: Installed, complete, or failed
- **Operator State**: Running, error, or stopped

---

## Scaling and Deployment Patterns

### Horizontal Scaling

- **Operator Scaling**: Scale operator deployment
- **Catalog Scaling**: Scale catalog deployments
- **CRD Scaling**: Handle many CR instances

### High Availability

- **Operator HA**: Multiple operator replicas
- **OLM HA**: OLM controller replicas
- **Catalog HA**: Catalog server replicas
- **CR HA**: High availability for managed application

### Production Deployments

- **Catalog Setup**: Set up operator catalog
- **RBAC Configuration**: Configure operator permissions
- **Security Setup**: Enable network policies, secrets
- **Monitoring Setup**: Configure operator metrics
- **Logging Setup**: Centralize operator logs
- **Backup Strategy**: Backup CRs and configurations
- **Update Strategy**: Plan operator upgrades
- **Resource Quotas**: Set namespace limits

### Upgrade Strategies

- **Catalog Upgrade**: Update catalog with new bundles
- **Operator Upgrade**: Upgrade operator via OLM
- **CRD Migration**: Handle CRD schema changes
- **Testing**: Verify upgrade success

### Resource Management

- **CPU Resources**: Set operator CPU limits
- **Memory Resources**: Configure operator memory limits
- **Storage Resources**: Configure CR storage
- **Network Resources**: Configure webhook network

---

## Additional Resources

- **Official Documentation:** https://operatorframework.io/docs/
- **GitHub Repository:** Check the project's official documentation for repository link
- **CNCF Project Page:** [cncf.io/projects/cncf-operator-framework/](https://www.cncf.io/projects/cncf-operator-framework/)
- **Community:** Check the official documentation for community channels
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

---

## When to Use

Use this skill when:

- **Integrating a CNCF project into Kubernetes infrastructure** — You need to configure, deploy, or troubleshoot a cloud-native tool within a cluster
- **Designing cloud-native architecture** — You are selecting and integrating CNCF tools to solve specific infrastructure challenges
- **Resolving operational issues** — A CNCF component is misbehaving, underperforming, or needs configuration changes
---

## Core Workflow

1. **Assess Requirements** — Understand the use case, scale, integration needs, and existing infrastructure. **Checkpoint:** Document requirements, constraints, and success criteria.

2. **Design Architecture** — Plan component interactions, data flow, and deployment strategy using cloud-native best practices. **Checkpoint:** Verify the architecture addresses all requirements and follows CNCF conventions.

3. **Implement & Configure** — Create manifests, configurations, and deployment scripts. Include resource limits, health checks, and observability hooks. **Checkpoint:** Validate all YAML against schema and test in a staging environment.

4. **Deploy & Monitor** — Apply manifests to the cluster, verify component health, and confirm observability is working. **Checkpoint:** Confirm all pods/services are running, probes passing, and metrics/alerts configured.

---

## Constraints

### MUST DO
- Include at least one complete working YAML manifest example
- Note when content is auto-generated vs. manually verified
- Reference relevant CNCF project documentation

### MUST NOT DO
- Deploy manifests without testing in a staging environment first
- Use deprecated API versions (e.g., apps/v1beta1)
- Omit resource limits and requests in Kubernetes manifests
