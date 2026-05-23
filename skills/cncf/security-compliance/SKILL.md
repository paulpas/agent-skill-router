---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: Implements security compliance frameworks (SOC2, HIPAA, PCI-DSS) with
  implementation patterns, audit procedures, and compliance automation for Kubernetes
  and cloud environments
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: code
  related-skills: agent-database-admin, agent-network-troubleshooting, cncf-kubernetes-debugging
  role: implementation
  scope: implementation
  triggers: soc2 compliance, hipaa security, pci dss requirements, security auditing,
    compliance framework, regulatory requirements, audit trails, security controls
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  - non-containerized architecture
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  version: 1.0.0
name: security-compliance
------
# Security Compliance and Auditing

Implements comprehensive security compliance frameworks including SOC2, HIPAA, and PCI-DSS controls with automated audit procedures, evidence collection, and regulatory documentation for Kubernetes environments and cloud infrastructure.

## TL;DR Checklist

- [ ] Identify applicable compliance framework (SOC2 Type II, HIPAA, PCI-DSS v4.0)
- [ ] Map controls to technical implementations (CC6, CC7, CC8 for SOC2)
- [ ] Deploy automated compliance scanning (Trivy, OpenSCAP, Klar)
- [ ] Implement audit trail collection with log aggregation
- [ ] Configure access control policies (RBAC, IAM, network policies)
- [ ] Generate compliance evidence packages for auditor review
- [ ] Schedule quarterly compliance assessments and remediation
- [ ] Document compensating controls for any identified gaps

