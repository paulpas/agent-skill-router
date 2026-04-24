---
name: coding-security-review
description: Security-focused code review identifying vulnerabilities like injection,
  XSS, insecure deserialization, and misconfigurations, with remediation guidance
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  role: implementation
  scope: implementation
  output-format: code
  triggers: identifying, security review, security-focused, security-review, vulnerabilities,
    vulnerability scanning, security, security auditing
  author: https://github.com/Jeffallan
  source: https://github.com/farmage/opencode-skills
---




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
|------|---------|-------------|
| SQL Injection | String interpolation in queries | Parameterized queries |
| XSS | Unescaped user input in HTML | Output encoding, CSP headers |
| Command Injection | shell=True, os.system() | subprocess with list args |
| LDAP Injection | Unescaped search filters | Input validation, parameterized queries |

### Authentication & Authorization

| Issue | Risk | Fix |
|-------|------|-----|
| Hardcoded secrets | Credential exposure | Environment variables, secrets manager |
| Weak password policies | Brute force | Complexity requirements, rate limiting |
| Missing CSRF tokens | Cross-site attacks | Anti-CSRF tokens |
| Overly permissive RBAC | Privilege escalation | Principle of least privilege |

### Data Protection

| Concern | Best Practice |
|---------|---------------|
| Sensitive data in logs | Mask or redact sensitive fields |
| Unencrypted secrets | Use environment variables or vault |
| Insecure cookies | HttpOnly, Secure, SameSite flags |
| Weak crypto | Use vetted libraries (pycryptodome, cryptography) |

## OWASP Top 10 Checks

### A01:2021 - Broken Access Control
- [ ] Verify authorization checks on all endpoints
- [ ] Check for horizontal privilege escalation
- [ ] Validate vertical privilege escalation prevention
- [ ] Test IDOR (Insecure Direct Object Reference)

### A02:2021 - Cryptographic Failures
- [ ] Verify strong algorithms (AES-256, RSA-2048+)
- [ ] Check for proper key management
- [ ] Validate password hashing (bcrypt, argon2)
- [ ] Test for weak random number generation

### A03:2021 - Injection
- [ ] Parameterized queries for all database access
- [ ] Input validation on all user inputs
- [ ] Sanitize HTML output for XSS prevention
- [ ] Command execution with explicit argument lists

### A05:2021 - Security Misconfiguration
- [ ] Debug modes disabled in production
- [ ] Security headers configured (CSP, HSTS, X-Frame-Options)
- [ ] Default credentials changed
- [ ] Directory listing disabled

### A07:2021 - Cross-Site Scripting (XSS)
- [ ] Output encoding for all user-controlled data
- [ ] Content Security Policy headers
- [ ] HTML sanitization for rich text
- [ ] HTTP-only cookies for sessions

## Constraints

### MUST DO
- Reference OWASP Top 10 for vulnerability categories
- Provide specific remediation code samples
- Explain the attack vector for each finding
- Prioritize by CVSS score when available
- Include secure coding references

### MUST NOT DO
- Report vulnerabilities without remediation steps
- Use generic security advice (be specific)
- Skip explaining the attack vector
- Recommend home-grown crypto algorithms

## Output Template

Security review report must include:
1. **Executive Summary** — Overall security posture, critical findings count
2. **Critical vulnerabilities** — Immediate remediation required
3. **High severity** — Address before next release
4. **Medium severity** — Include in current sprint
5. **Low severity** — Technical debt tracking
6. **Remediation** — Specific code changes and secure patterns
7. **Verification steps** — How to confirm fix works

## Knowledge Reference

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- CWE/SANS Top 25: https://cwe.mitre.org/top25/
- SANS Security Coding: https://www.sans.org/security-resources/coding/
- Secure Coding Standards (CERT)

## Code Examples

### Secure Password Hashing

```python
import bcrypt

def hash_password(password: str) -> bytes:
    """Hash password with bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode(), salt)

def verify_password(password: str, hashed: bytes) -> bool:
    """Verify password against hash."""
    return bcrypt.checkpw(password.encode(), hashed)
```

### Parameterized Query (Prevents SQL Injection)

```python
import psycopg2

def get_user(conn, user_id: int):
    """Safe query using parameterized statement."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, username, email FROM users WHERE id = %s",
            (user_id,)
        )
        return cur.fetchone()
```

### Output Encoding (Prevents XSS)

```python
from html import escape

def render_user_comment(comment: str) -> str:
    """Safely render user comment, escaping HTML."""
    return f"<div class='comment'>{escape(comment)}</div>"
```
