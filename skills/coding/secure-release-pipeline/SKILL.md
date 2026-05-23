---
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: Implements comprehensive secure release pipeline with CVE scanning, security
  code review, semantic versioning for patches, and multi-stage quality gates for
  secure deployments.
license: MIT
maturity: stable
metadata:
  domain: coding
  output-format: code
  related-skills: code-review, risk-management
  role: implementation
  scope: implementation
  triggers: secure release, CVE scanning, security audit, version management, quality
    gates, dependency security, semantic versioning, incident response
  archetypes:
  - tactical
  - generation
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  version: 1.0.0
name: release-pipeline
------
# Secure Release Pipeline Manager

Implements comprehensive security controls throughout the software release lifecycle — from dependency scanning and code review to version management and incident response — ensuring zero compromises on security while maintaining delivery velocity.

## TL;DR Checklist

- [ ] Run all dependency CVE scanners (Snyk, Dependabot, Trivy) before any build
- [ ] Block releases if critical/high CVEs are present (severity thresholds)
- [ ] Run OWASP Top 10 coverage checks + SAST/DAST before merge
- [ ] Enforce semantic versioning: patches fix CVEs, minors add features, majors break compat
- [ ] Pin all production dependencies; lock transitive dependencies
- [ ] Execute multi-stage quality gates with automated approvals
- [ ] Block on critical issues; warn but allow on medium with approval
- [ ] Document and communicate any security incident within 1 hour

