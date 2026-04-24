---
name: cncf-azure-service-bus
description: Messaging service with queues and topics for reliable communication.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: cncf
  role: reference
  scope: infrastructure
  output-format: manifests
  triggers: service bus, messaging, message queue, queues, topics, event messaging
  related-skills: cncf-azure-functions, cncf-azure-monitor, cncf-azure-event-hubs, cncf-azure-rbac
---


# Azure Service Bus

Deploy and manage azure service bus infrastructure as part of your cloud-native environment.

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

Use azure service bus when:

- Running cloud infrastructure workloads
- Requiring managed services from the platform
- Needing automatic scaling and high availability
- Integrating with other cloud services
- Building cloud-native applications

---

## When NOT to Use

Avoid azure service bus when:

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
| `cncf-azure-functions` | Related infrastructure service |
| `cncf-azure-monitor` | Related infrastructure service |
| `cncf-azure-event-hubs` | Related infrastructure service |
| `cncf-azure-rbac` | Related infrastructure service |
