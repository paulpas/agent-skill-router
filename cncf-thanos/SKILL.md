---
name: cncf-thanos
description: Thanos in High availability Prometheus solution with long-term storage
---

# Thanos in Cloud-Native Engineering

**Category:** Observability  
**Status:** Active  
**Stars:** 9,500  
**Last Updated:** 2026-04-22  
**Primary Language:** Go  
**Documentation:** [High availability Prometheus solution with long-term storage](https://thanos.io/tip/)  

---

## Purpose and Use Cases

Thanos is a core component of the cloud-native ecosystem, serving as long-term storage

### What Problem Does It Solve?

Thanos addresses the challenge of Prometheus scalability and long-term storage. It provides global query view, long-term storage, and cross-cluster observability.

### When to Use This Project

Use Thanos when need Prometheus HA, require long-term metrics, or manage multiple Prometheus instances. Not ideal for simple deployments or when large-scale Prometheus deployments, multi-cluster monitoring, or metrics retention needs.

### Key Use Cases

- Global Query View for Prometheus
- Long-Term Metrics Storage
- Multi-Cluster Monitoring
- Prometheus High Availability
- Cost-Effective Metrics Storage

---

## Architecture Design Patterns

### Core Components

- **Query**: Global query endpoint
- **Store Gateway**: Object storage interface
- **Ruler**: Rule evaluation
- **Compactor**: Data compaction
- **Receive**: Receives metrics from Prometheus

### Component Interactions

1. **Query → Store Gateway**: Query fetches data from store
1. **Store Gateway → Object Storage**: Store reads from S3/GCS
1. **Ruler → Store Gateway**: Ruler queries for rules
1. **Compactor → Store Gateway**: Compaction operations

### Data Flow Patterns

1. **Metric Ingestion**: Prometheus →Receive →Store Gateway →Object Storage
1. **Query Processing**: Query → Store Gateway → Object Storage → Result
1. **Rule Evaluation**: Ruler evaluates → Store Gateway → Alert
1. **Compaction**: Compactor reads → Compacts → Writes back

### Design Principles

- **Prometheus Compatible**: Full Prometheus API compatibility
- **Horizontal Scalability**: Scale horizontally
- **Cost Efficiency**: Use cheap object storage
- **High Availability**: HA for Prometheus metrics

---

## Integration Approaches

### Integration with Other CNCF Projects

- **Prometheus**: Source of metrics
- **Kubernetes**: Deployment platform
- **S3/GCS**: Object storage backend
- **Grafana**: Visualization

### API Patterns

- **Thanos Query API**: Global query endpoint
- **Store API**: Store Gateway API
- **Ruler API**: Rule evaluation API
- **Receive API**: Receive API for Prometheus

### Configuration Patterns

- **Query Config**: Query component config
- **Store Config**: Store Gateway config
- **Ruler Config**: Rule evaluation config
- **Compactor Config**: Compaction config

### Extension Mechanisms

- **Custom Storage**: Add storage backends
- **Custom Query Functions**: Add query functions
- **Custom Rulers**: Custom rule evaluation

---

## Common Pitfalls and How to Avoid Them

### Misconfigurations

- **Object Storage Costs**: High storage costs
  - **How to Avoid**: Configure compaction, use appropriate storage class
- **Data Ingestion**: Data not reaching store
  - **How to Avoid**: Check Prometheus config, verify receive endpoint

### Performance Issues

- **Store Gateway Memory**: High memory usage
  - **How to Avoid**: Configure cache limits, tune store gateway
- **Rule Evaluation**: Rules not evaluated
  - **How to Avoid**: Check ruler connectivity, verify rule files

### Operational Challenges

- **Version Compatibility**: Version mismatch
  - **How to Avoid**: Use compatible versions, check release notes
- **Timestamp Issues**: Timestamp synchronization
  - **How to Avoid**: Use NTP, sync clocks across components

### Security Pitfalls


---

## Coding Practices

### Idiomatic Configuration

- **Sidecar Deployment**: Deploy sidecar with Prometheus
- **Query Optimization**: Optimize query patterns
- **Rule Management**: Manage rules through Ruler

### API Usage Patterns

- **thanos query**: Query API endpoint
- **thanos store**: Store Gateway CLI
- **thanos ruler**: Rule evaluation CLI
- **kubectl apply**: Apply configurations

### Observability Best Practices

- **Thanos Metrics**: Monitor Thanos components
- **Query Metrics**: Track query performance
- **Storage Metrics**: Monitor storage usage

### Testing Strategies

- **Integration Tests**: Test query integration
- **Performance Tests**: Validate query performance
- **Failover Tests**: Test component failure

### Development Workflow

- **Local Development**: Use docker-compose
- **Debug Commands**: Check component logs
- **Test Environment**: Set up test deployment
- **CI/CD Integration**: Automate testing
- **Monitoring Setup**: Configure observability
- **Documentation**: Maintain docs

---

## Fundamentals

### Essential Concepts

- **Thanos Query**: Global query endpoint
- **Store Gateway**: Object storage interface
- **Query Frontend**: Query caching layer
- **Ruler**: Rule evaluation
- **Compactor**: Data compaction
- **Receive**: Metrics receiver
- **Sidecar**: Prometheus sidecar
- **Bucket**: Object storage bucket

### Terminology Glossary

- **Store API**: Thanos store interface
- **Query API**: Global query API
- **Compaction**: Data compaction process
- **Sidecar**: Prometheus sidecar
- **Bucket**: Object storage bucket

### Data Models and Types

- **Block**: Time-series data block
- **Index**: Data index
- **Metadata**: Block metadata
- **Chunk**: Compressed data chunks

### Lifecycle Management

- **Component Startup**: Component starts → Connects → Ready
- **Data Ingestion**: Prometheus → Sidecar → Store → Object Storage
- **Query Processing**: Request → Query → Store → Result
- **Compaction Process**: Read blocks → Compact → Write new block

### State Management

- **Query State**: Healthy or degraded
- **Store State**: Ready or offline
- **Rule State**: Active or error
- **Compactor State**: Running or paused

---

## Scaling and Deployment Patterns

### Horizontal Scaling

- **Query Scaling**: Scale query replicas
- **Store Scaling**: Scale store gateways
- **Ruler Scaling**: Scale ruler instances
- **Receive Scaling**: Scale receive instances

### High Availability

- **Query HA**: Multiple query replicas
- **Store HA**: Store Gateway redundancy
- **Ruler HA**: Ruler replicas
- **Sidecar HA**: Prometheus HA with sidecar

### Production Deployments

- **Cluster Setup**: Deploy Thanos components
- **Object Storage Config**: Configure S3/GCS
- **Network Config**: Configure network
- **Security Setup**: Enable TLS, RBAC
- **Monitoring Setup**: Configure metrics
- **Logging Setup**: Centralize logs
- **Backup Strategy**: Backup configurations
- **Performance Tuning**: Optimize queries

### Upgrade Strategies

- **Component Upgrade**: Upgrade each component
- **Config Migration**: Update configurations
- **Testing**: Verify functionality
- **Rollback Plan**: Prepare rollback

### Resource Management

- **CPU Resources**: Component CPU limits
- **Memory Resources**: Memory limits
- **Storage Resources**: Object storage access
- **Network Resources**: Network configuration

---

## Additional Resources

- **Official Documentation:** https://thanos.io/tip/
- **GitHub Repository:** Check the project's official documentation for repository link
- **CNCF Project Page:** [cncf.io/projects/cncf-thanos/](https://www.cncf.io/projects/cncf-thanos/)
- **Community:** Check the official documentation for community channels
- **Versioning:** Refer to project's release notes for version-specific features

---

*Content generated automatically. Verify against official documentation before production use.*