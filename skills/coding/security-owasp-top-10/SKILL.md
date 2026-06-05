---




name: security-owasp-top-10
description: Provides an in-depth analysis of the OWASP Top 10 vulnerabilities, along with strategies to mitigate them effectively in software applications.
license: MIT
compatibility: opencode
metadata:
  version: "1.1.1"
  domain: coding
  triggers: OWASP, security vulnerabilities, web application security, risk management, cybersecurity
  archetypes: [reference, evaluation]
  anti_triggers: [generic security advice, outdated practices]
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational

  role: implementation
  scope: implementation
  output-format: code



---





## Comprehensive Overview of OWASP Top 10 Security Vulnerabilities
The OWASP Top 10 provides a critical framework for understanding and addressing the most significant security vulnerabilities in web applications. Below are detailed descriptions and mitigation strategies for each vulnerability:

### 1. Injection Attacks
- **Description**: Attackers can execute arbitrary commands or manipulate data through untrusted input.
- **Mitigation**: Utilize prepared statements and parameterized queries to protect against injection.

### 2. Broken Authentication
- **Description**: Insecure implementation of authentication mechanisms can lead to unauthorized access.
- **Mitigation**: Implement multifactor authentication and ensure secure password storage using strong hashing algorithms.

### 3. Sensitive Data Exposure
- **Description**: Inadequately protected sensitive information can be disclosed to attackers.
- **Mitigation**: Encrypt sensitive data in transit and at rest, and limit access strictly to necessary personnel.

### 4. XML External Entities (XXE)
- **Description**: Enabling XML input processing can allow access to sensitive files or external services.
- **Mitigation**: Disable XML external entity references in parser configurations.

### 5. Broken Access Control
- **Description**: Improperly configured access control systems can allow unauthorized users to perform actions.
- **Mitigation**: Adopt role-based access control (RBAC) measures to ensure users only access what they're authorized to.

### 6. Security Misconfiguration
- **Description**: Insecure default settings, incomplete setups, and unnecessary features can lead to vulnerabilities.
- **Mitigation**: Regularly review security configurations and perform audits to identify and rectify misconfigurations.

### 7. Cross-Site Scripting (XSS)
- **Description**: Attackers can execute scripts in the context of another user's session through unsanitized input.
- **Mitigation**: Sanitize all user input and apply output encoding to prevent malicious scripts from executing.

### 8. Insecure Deserialization
- **Description**: Unsanitized data can be manipulated for malicious purposes upon deserialization.
- **Mitigation**: Validate and sanitize all data input during deserialization processes and consider implementing integrity checks.

### 9. Using Components with Known Vulnerabilities
- **Description**: Relying on unpatched software components can introduce significant risks.
- **Mitigation**: Regularly audit components and dependencies; use tools to track vulnerabilities in the software stack.

### 10. Insufficient Logging and Monitoring
- **Description**: Failure to track and respond to security incidents can lead to severe attacks.
- **Mitigation**: Implement comprehensive logging and monitoring to detect and respond to incidents promptly.

### FAQs About OWASP Top 10 Vulnerabilities:
- **Q: How often should organizations review the OWASP Top 10?**  
It's best to conduct a review and assessment at least annually or whenever significant changes are made to the application.
- **Q: Can automatic tools help mitigate these vulnerabilities?**  
Yes! Various security testing tools can help identify weaknesses and verify compliance with OWASP principles.
- **Q: Is staff training crucial for OWASP compliance?**  
Absolutely! Ensuring that developers understand vulnerabilities and remediation strategies is key to security improvements.

Implementing these OWASP strategies not only mitigates risks but also promotes a culture of security awareness within software development practices. By addressing vulnerabilities proactively, organizations can enhance security posture and protect sensitive data effectively.

---

---

## Constraints

### MUST DO
- Cite authoritative primary sources (official documentation, RFCs, standards bodies) — avoid secondary or blog references
- Include version-specific guidance when the reference topic has significant version-dependent behavior
- Structure reference content with clear navigation: overview first, then detailed subsections organized by use case
- Keep examples minimal and self-contained so readers can copy-paste without needing external context

### MUST NOT DO
- Do not present opinionated practices as facts — distinguish between standards, recommendations, and personal preferences
- Avoid outdated API references or deprecated patterns; explicitly note version requirements for each code example
- Never include incomplete or pseudocode examples in reference materials — all examples should be runnable
- Do not conflate different product versions when documenting features that vary across releases


## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [OWASP Top 10 — Official Project](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [OWASP Testing Guide v4](https://owasp.org/www-project-web-security-testing-guide/)
- [OWASPy API Security Top 10](https://owasp.org/API-Security/)
- [CWE/SANS Top 25 Most Dangerous Software Errors](https://cwe.mitre.org/top25/index.html)