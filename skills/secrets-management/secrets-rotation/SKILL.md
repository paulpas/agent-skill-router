---
name: secrets-rotation
description: Manages the periodic and automatic rotation of sensitive secrets, integrating techniques applicable to systems like AWS Secrets Manager and HashiCorp Vault while ensuring minimal disruption to services and enhancing overall security and compliance measures for sensitive information.
license: MIT
compatibility: opencode
metadata:
  version: "1.1.0"
  domain: secrets-management
  triggers: secrets rotation, automatic rotation, credential rotation, secret management, HashiCorp Vault, AWS Secrets Manager, key rotation, password rotation, security compliance
  archetypes: [management, implementation]
  anti_triggers: [disruptive secret management, static secrets, poor access controls, weak security practices, manual rotations]
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
  role: reference
  scope: infrastructure
  output-format: report
---

# Secrets Rotation

## Detailed Practices
- **Implement Rotation Policies**: Establish clear policies on frequency and method for rotating secrets to minimize risks of compromise due to stale credentials or unauthorized access, ensuring sensitive information remains secure throughout its lifecycle.
- **User Notifications**: Communicate with stakeholders about upcoming rotations to prevent service disruptions and ensure all systems are prepared for the change, fostering a proactive security culture through clear communication across teams.
- **Validation**: Pre-validate new secrets before they're actively used, testing them in staging or development to ensure seamless transitions during rotation events and minimizing downtime to maintain service continuity.
- **Automated Rotations**: Utilize automation tools to manage secret rotations efficiently, reducing the likelihood of human error and increasing operational efficiency through consistent execution of policies across environments.
- **Auditing Rotations**: Keep detailed logs of rotations for compliance and security audits, ensuring that records are maintained and accessible for review to meet regulatory requirements and adhere to best practices for security management.
- **Continuous Improvement**: Regularly review the effectiveness of the secret rotation process, making adjustments based on automation logs and incidents to improve the overall security framework.

### Examples of Effective Secrets Rotation:
1. **AWS Secrets Manager Implementations**: Automate rotation using Lambda functions that trigger based on predefined schedules, minimizing operational overhead while enhancing security by ensuring secrets are always up-to-date.
2. **HashiCorp Vault**: Use Vault's built-in dynamic secrets feature to allow for automatic rotation without manual intervention, streamlining operations and securing applications by providing short-lived credentials that reduce risk and facilitate secure access management.

### Resources:
- **AWS Secrets Manager Documentation**: Detailed instructions on automated secret rotation techniques in AWS, focusing on operational security measures and best practices for effective management.
- **HashiCorp Vault Documentation**: Best practices and guidelines on how to effectively use Vault for secret management and rotation, ensuring comprehensive security measures are in place while meeting compliance requirements.

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

> Authoritative documentation links for this skill's domain. The model follows markdown links to resolve external references and inline content.

- [HashiCorp — Rotating Credentials](https://developer.hashicorp.com/vault/docs/secrets/rotating-credentials)
- [AWS Secrets Manager Rotation Guide](https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotate-secrets.html)
- [Azure Key Vault Secret Rotation](https://learn.microsoft.com/en-us/azure/key-vault/general/basic-concepts#secret-expiration-and-purge-date)
- [Google Cloud Secret Manager — Best Practices](https://cloud.google.com/secret-manager/docs/best-practices)
- [Secrets Management Automation (OWASP)](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)