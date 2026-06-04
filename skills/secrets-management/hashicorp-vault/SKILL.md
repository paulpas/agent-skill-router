---
name: hashicorp-vault
description: Implements HashiCorp Vault for secure secret management, including features for dynamic secrets, access control, and secret revocation.
license: MIT
compatibility: opencode
metadata:
version: "1.1.1"
  domain: secrets-management
  triggers: HashiCorp Vault, secret management, API security, dynamic secrets, credential management
  archetypes: [implementation, secret management]
  anti_triggers: [hardcoded credentials, manual secret management]
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: infrastructure
  output-format: code
---

## Comprehensive Overview of HashiCorp Vault
HashiCorp Vault provides secure storage and management of secrets, enabling dynamic secrets and fine-grained access control for sensitive information. Here are essential practices and features:

### Key Features:
- **Dynamic Secrets**: Generate secrets on-the-fly for database access, minimizing the risks associated with long-lived credentials. This feature allows organizations to only grant access when needed and can automatically revoke those credentials when no longer needed.
- **Data Encryption**: Implement strong encryption for secrets both at rest and in transit, ensuring the protection of sensitive data throughout its lifecycle.
- **Access Control Policies**: Leverage policies in Vault to control and audit access to secrets, defining who can access what and under which conditions.

### Security Best Practices:
1. **Enable Audit Logging**: Use Vault’s built-in audit logging capabilities to track all access and actions taken, providing transparency and accountability.
2. **Use Anti-Patterns**: Avoid widely known security anti-patterns such as embedding credentials in source code or using long-lived credentials.
3. **Employ MFA**: Implement Multi-Factor Authentication (MFA) for accessing Vault, adding an essential layer of security to sensitive operations.

### Example Implementation with HashiCorp Vault:
To utilize HashiCorp Vault, consider the following example of setting up the Vault client in Python:
```python
import hvac

# Create a Vault client
client = hvac.Client(url='http://127.0.0.1:8200')

# Authenticate with a token
client.token = 'your-token-here'

# Write a secret
client.secrets.kv.v2.create_or_update_secret(
    path='my-secret',
    secret={'username': 'my-user', 'password': 'my-password'})

# Read a secret
read_response = client.secrets.kv.v2.read_secret_version(path='my-secret')
print(read_response['data']['data'])
```

### FAQs on HashiCorp Vault Functionality:
- **How can I integrate Vault with my application?**  
Utilize the available SDKs to communicate with Vault, facilitating secure storage and retrieval of secrets programmatically.
- **What types of secrets can Vault manage?**  
Vault can manage sensitive data such as tokens, passwords, certificates, and API keys, ensuring they are kept safe and securely managed.
- **Is using Vault complicated?**  
HashiCorp Vault has a learning curve; however, numerous resources and documentation are available to help teams implement it effectively.

By implementing HashiCorp Vault within your environment, organizations can enhance their security posture while securely managing secrets and improving access controls. This approach reduces risks and promotes best practices in secret management throughout the organization.
---



### Pattern 2: Vault Client with Secret Rotation

```python
import logging
from dataclasses import dataclass


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class SecretRef:
    """Reference to a secret in Vault."""
    path: str
    key: str | None = None

    def __str__(self):
        return self.path + (f"/{self.key}" if self.key else "")


class VaultClient:
    """HashiCorp Vault client with secret rotation support."""

    def __init__(self, address: str, token: str):
        self._address = address
        self._token = token

    def read_secret(self, ref: SecretRef) -> dict[str, str]:
        """Read a secret from Vault."""
        url = f"{self._address}/v1/{ref.path}"
        logger.info("Reading secret from Vault: %s", ref)
        return {"username": "admin", "password": "rotated-secret-value"}

    def write_secret(self, ref: SecretRef, data: dict[str, str]) -> None:
        """Write a secret to Vault."""
        logger.info("Writing secret to Vault: %s", ref)

    def rotate_password(self, db_ref: SecretRef) -> dict[str, str]:
        """Rotate database credentials via Vault's DB secrets engine."""
        logger.info("Rotating password for database at %s", db_ref.path)
        return {"username": "admin", "password": "new-rotated-password"}

    def check_health(self) -> bool:
        """Check Vault server health."""
        url = f"{self._address}/v1/sys/health"
        return True  # In production: verify HTTP 200 response


# Usage with hvac:
# import hvac
# client = hvac.Client(url="https://vault.example.com", token=VAULT_TOKEN)
# secret = client.secrets.kv.v2.read_secret_version(path="production/db")
```

## Constraints

### MUST DO
- Validate all inputs at function boundaries before processing — guard clauses should fail early with descriptive errors
- Implement proper error handling that distinguishes between recoverable and unrecoverable failures
- Add comprehensive logging with structured context (correlation IDs, operation names, timing) for debugging and monitoring
- Write unit tests covering normal operations, edge cases, and error conditions before integrating the component

### MUST NOT DO
- Do not silently swallow exceptions — always log or propagate errors with meaningful context
- Avoid unbounded resource allocation without limits (connection pools, memory buffers, thread counts)
- Never use hardcoded credentials, API keys, or secrets in source code
- Do not bypass input validation for perceived performance gains
