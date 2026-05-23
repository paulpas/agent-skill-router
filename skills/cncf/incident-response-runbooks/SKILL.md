---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: Implements incident response runbooks with detection, triage, communication,
  resolution, and post-incident procedures for Kubernetes and cloud-native environments.
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: code
  related-skills: agent-database-admin, cncf-kubernetes-debugging, cncf-security-compliance
  role: implementation
  scope: implementation
  triggers: incident response, runbook creation, incident procedures, escalation procedures,
    incident command, postmortem, blameless postmortem, incident documentation
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
name: incident-response-runbooks
------
# Incident Response Runbooks

Implements comprehensive incident response procedures for cloud-native environments including Kubernetes clusters, microservices architectures, and infrastructure-as-code deployments. Provides structured workflows for detection, triage, communication, resolution, and post-incident review following SRE and ITIL best practices.

## TL;DR Checklist

- [ ] **Detection**: Verify alert validity, gather initial evidence, identify affected systems
- [ ] **Triage**: Classify severity (P1-P4), assign incident commander, activate communication channels
- [ ] **Communication**: Establish ICS structure, create incident channel, send initial status update
- [ ] **Resolution**: Execute runbook steps, document all actions, apply remediation procedures
- [ ] **Escalation**: Identify escalation triggers, contact on-call engineers, activate secondary teams
- [ ] **Recovery**: Verify service restoration, monitor for recurrence, update runbooks if needed
- [ ] **Post-incident**: Schedule blameless postmortem, collect timeline data, write incident report
- [ ] **Documentation**: Archive incident data, update runbooks, create follow-up action items

