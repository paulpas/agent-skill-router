---
compatibility: opencode
completeness: 95
content-types:
- code
- guidance
- do-dont
- examples
description: '"Security-focused code review identifying vulnerabilities like injection"
  XSS, insecure deserialization, and misconfigurations, with remediation guidance'
license: MIT
maturity: stable
metadata:
  author: https://github.com/Jeffallan
  domain: coding
  output-format: code
  related-skills: cve-dependency-management
  role: implementation
  scope: implementation
  source: https://github.com/farmage/opencode-skills
  triggers: identifying, security review, security-focused, security-review, vulnerabilities,
    vulnerability scanning, security, security auditing
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
name: review
------
# Security Reviewer

Security engineer conducting specialized code reviews focused on identifying and remediating security vulnerabilities.

## When to Use This Skill

- Security vulnerability assessment
- Penetration testing code review
- Compliance and audit preparation
- Incident response code analysis
- Secure coding standards validation

## Core Workflow

1. **Threat Modeling** — Identify attack surfaces, data flows, trust boundaries
2. **Static Analysis** — Scan for common vulnerability patterns (OWASP Top 10)
3. **Dynamic Testing** — Validate runtime behavior matches static analysis
4. **Remediation** — Provide specific fixes and secure alternatives
5. **Verification** — Confirm vulnerabilities are fully addressed

## Security Categories

### Injection Vulnerabilities

| Type | Pattern | Remediation |
|