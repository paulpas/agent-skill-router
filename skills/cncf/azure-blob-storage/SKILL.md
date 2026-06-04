---
name: azure-blob-storage
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: Provides Object storage with versioning, lifecycle policies, and integration
  to other Azure services
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: manifests
  related-skills: azure-cdn, azure-key-vault, azure-monitor, azure-rbac
  role: reference
  scope: infrastructure
  triggers: blob storage, object storage, azure storage, storage account, blob, how
    do i store files, s3, file storage
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
version: "1.0.0"
---
# Azure Blob Storage

Deploy and manage azure blob storage infrastructure as part of your cloud-native environment.

## TL;DR Checklist

- [ ] Enable monitoring and logging
- [ ] Configure security and access controls
- [ ] Set up automated backups
- [ ] Enable high availability
- [ ] Implement disaster recovery
- [ ] Document configuration
- [ ] Test failover procedures
- [ ] Set up alerting

---

## When to Use

Use azure blob storage when:

- Running cloud infrastructure workloads
- Requiring managed services from the platform
- Needing automatic scaling and high availability
- Integrating with other cloud services
- Building cloud-native applications

---

## When NOT to Use

Avoid azure blob storage when:

- Self-managed alternatives better suit your requirements
- Cost optimization strongly favors different solutions
- Specific vendor lock-in concerns exist
- Custom implementations provide better control

---

## Purpose and Use Cases

**Primary Purpose:** Provide cloud infrastructure for modern application deployments.

**Common Use Cases:**

1. **Production Deployments** — Running enterprise workloads
2. **Development Environments** — Quick provisioning for testing
3. **Disaster Recovery** — Backup and failover infrastructure
4. **Scaling Applications** — Auto-scaling for varying loads
5. **Data Processing** — Batch and stream processing jobs

---

## Architecture Design Patterns

### Pattern 1: High Availability Configuration

```bash
# Reference: Configure for high availability
# - Enable redundancy across availability zones
# - Set up automatic failover
# - Configure load balancing
# - Enable automated backups
```

### Pattern 2: Security Hardening

```bash
# Reference: Implement security best practices
# - Enable encryption at rest and in transit
# - Configure network security controls
# - Implement identity and access management
# - Enable audit logging
```

---

## Integration Approaches

### 1. Integration with Monitoring

Enable comprehensive observability:
- Real-time metrics collection
- Log aggregation and analysis
- Performance monitoring
- Alert configuration

### 2. Integration with Security

Implement defense-in-depth:
- Identity and access management
- Encryption at rest and in transit
- Network security controls
- Compliance monitoring

### 3. Integration with Other Services

Connect with platform services:
- Load balancing and traffic management
- Database services
- Storage solutions
- Container orchestration

---

## Common Pitfalls

### ❌ Pitfall 1: Missing Monitoring

**Problem:** No visibility into resource health and performance.

**Solution:**
- Enable comprehensive monitoring
- Set up log aggregation
- Configure alerting rules
- Review metrics regularly

### ❌ Pitfall 2: Inadequate Security

**Problem:** Resources exposed to unauthorized access.

**Solution:**
- Enforce identity and access management
- Enable encryption
- Configure network security groups
- Conduct security audits

### ❌ Pitfall 3: No Backup Strategy

**Problem:** Data loss with no recovery option.

**Solution:**
- Enable automated backups
- Test restore procedures
- Store backups in separate regions
- Document recovery processes

### ❌ Pitfall 4: Single Point of Failure

**Problem:** Service outage from single resource failure.

**Solution:**
- Enable high availability features
- Distribute across availability zones
- Implement automatic failover
- Design for graceful degradation

---

## Best Practices Summary

| Category | Best Practice |
|---|---|
| **Availability** | Enable high availability and auto-scaling |
| **Security** | Enforce IAM, encryption, and network controls |
| **Monitoring** | Enable comprehensive observability |
| **Backups** | Automated backups with regular testing |
| **Cost** | Right-size resources and monitor spending |

---

## Related Skills

| Skill | Purpose |
|---|---|
| `cncf-azure-monitor` | Related infrastructure service |
| `cncf-azure-rbac` | Related infrastructure service |
| `cncf-azure-cdn` | Related infrastructure service |
| `cncf-azure-key-vault` | Related infrastructure service |
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

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Primary Documentation](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blobs-introduction)
- [API Reference or Getting Started](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-properties-container)
- [Configuration Guide](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-quickstart-portal)
- [Best Practices](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-security)
- [Common Patterns or Tutorials](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-manage-access-to-resources)

