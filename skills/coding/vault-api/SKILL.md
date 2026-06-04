---




name: vault-api
description: Implements HashiCorp Vault API integration (KV Secrets Engine, PKI, Transit, Auth Methods, Leasing & Renewal) using hvac Python SDK v2.4+ with proper authentication, secret leasing, TTL management, and encryption as a service patterns.
license: MIT
compatibility: opencode
metadata:
  version: "1.1.0"
  domain: coding
  triggers:
    - hashicorp vault
    - hvac python
    - vault kv secrets
    - vault pki
    - vault transit
    - how do i use vault
    - vault leasing
    - secret management
  archetypes:
    - tactical
    - generation
  anti_triggers:
    - vague implementations
    - manual processes
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational

  role: implementation
  scope: implementation
  output-format: code



---





# HashiCorp Vault Integration (Secrets Management)
Implements production-grade HashiCorp Vault integration using the `hvac` Python SDK v2.4+. When loaded, this skill makes the model implement KV (Key/Value) secrets engine v1/v2 operations, Transit (encryption as a service), PKI (certificate generation), AppRole authentication, Token auth, LDAP/Kubernetes auth methods, secret leasing and renewal, TTL management, and response wrapping. All implementations follow Vault best practices: use environment variables for auth, proper token lifecycle management (lease renewal, revoke on exit), short-lived dynamic secrets instead of long-lived credentials, encryption/decryption via Transit (never roll your own crypto), and wrapping tokens for secure one-time delivery.
## TL;DR Checklist
- [ ] Use `hvac.Client(url=..., token=...)` or auth method for initializing\n- [ ] Read `VAULT_ADDR` and `VAULT_TOKEN` from environment (never hardcode)\n- [ ] KV v2: `client.secrets.kv.v2.read_secret_version()`, `create_or_update_secret()`\n- [ ] KV v1: `client.secrets.kv.v1.read_secret()`, `create_or_update_secret()`\n- [ ] Transit: `client.secrets.transit.encrypt_data()`, `decrypt_data()`\n- [ ] PKI: `client.secrets.pki.generate_certificate()`, `sign_intermediate()`\n- [ ] Auth methods: `client.auth.approle.login()`, `token.create()`, `ldap.login()`, `kubernetes.login()`\n- [ ] Leasing: `client.sys.renew_secret()`, `sys.renew_token()`, `sys.revoke_secret()`\n- [ ] Wrapping: `client.secrets.kv.v2.create_or_update_secret(..., wrap_ttl='60s')` then `client.sys.unwrap()`\n- [ ] Always revoke leased secrets when done (try/finally pattern)\n- [ ] Never log or print secrets or tokens\n- [ ] Use short TTLs and rotate/renew periodically
## Core Workflow
Initialize Vault Client: Create `hvac.Client()` from environment variables `VAULT_ADDR` and `VAULT_TOKEN`, or use auth method (AppRole, LDAP, Kubernetes, etc.). **Checkpoint:** Verify connection with `client.is_authenticated()` or simple `sys.read_health_status()`.; Choose Authentication Method: Select appropriate auth:   - Development/local: Token auth (`VAULT_TOKEN`)\n    - Apps/services: AppRole (`role_id` + `secret_id` or response wrapping)\n    - Kubernetes: Kubernetes auth using service account JWT\n    - Human users: LDAP, Userpass, OIDC\n    **Checkpoint:** Each auth method returns a token with associated policies — verify policies grant correct access.\n3. **KV Secrets Operations** — Use KV v2 for versioned secrets:\n    - `client.secrets.kv.v2.create_or_update_secret()`\n    - `client.secrets.kv.v2.read_secret_version()`\n    - `client.secrets.kv.v2.delete_latest_version_of_secret()`\n    - `client.secrets.kv.v2.destroy_secret_versions()`\n    For KV v1: Use `client.secrets.kv.v1.*` methods.\n    **Checkpoint:** Always check `data['data']['key']` (v2 wraps in extra `data` level).\n4. **Transit (Encryption as a Service)** — Create key with `client.secrets.transit.create_key()`, encrypt data with `encrypt_data(name, plaintext=base64_text)`, decrypt with `decrypt_data(name, ciphertext=ciphertext)`. Also supports: rewrap, datakey generation, signing/verification, hashing, HMAC. **Checkpoint:** Plaintext must be base64-encoded before encryption.\n5. **Dynamic Secrets & Leasing** — Request dynamic credentials (DB, AWS, etc.). Response contains `lease_id`, `lease_duration`, `renewable`. Renew before expiry with `client.sys.renew_secret(lease_id)`. Revoke when done with `client.sys.revoke_secret(lease_id)`. Use try/finally pattern. **Checkpoint:** Most leases are renewable up to `max_ttl` — after that, must get fresh credentials.\n6. **Response Wrapping** — For secure one-time secret delivery: create secret with `wrap_ttl='60s'` → receive `wrap_info.token`. Unwrap using `client.sys.unwrap(wrapping_token)`. Can only unwrap once. **Checkpoint:** Verify `wrap_info.creation_path` and `wrap_info.ttl` after unwrapping to ensure correct source.\n7. **Token & Lease Management** — Best practices:   - Use minimum required policies (least privilege)\n    - Set shortest practical TTL on tokens/secrets\n    - Renew leases before `lease_duration` elapses (use buffer)\n    - Always revoke when no longer needed\n    - Never log tokens or secrets\n    **Checkpoint:** Set up periodic renewal task or use HVAC's `AutoAuth` if available.\n## Implementation Patterns
### Pattern 1: Vault Client Initialization (BAD vs GOOD)\n```python
"""HashiCorp Vault hvac SDK initialization patterns.\n\nHVAC is the official Python client for HashiCorp Vault.\n\nAuthentication methods supported:\n- Token: VAULT_TOKEN env var or explicit token parameter\n- AppRole: role_id + secret_id (machine identity)\n- LDAP: username/password against LDAP/Active Directory\n- Userpass: internal Vault username/password\n- Kubernetes: service account JWT for K8s pods\n- OIDC: OAuth2/OIDC external identity providers\n- AWS IAM: AWS authentication using signature\n\nVersion: hvac >= 2.4.0\nPython >= 3.8\n"""\nfrom __future__ import annotations\nimport os\nimport json\nimport logging\nimport time\nimport base64\nfrom datetime import datetime, timedelta\nfrom typing import Any, Dict, List, Optional, Callable\nimport hvac\nfrom hvac import Client as VaultClient\nfrom hvac.exceptions import (\n    InvalidRequest,\n    VaultError,\n    Forbidden,\n    Unauthorized,\n    PathNotFound,\n)\nlogger = logging.getLogger(__name__)\n# ===================================================================\n# ❌ BAD — hardcoded addresses/tokens, no verification, no cleanup\n# ===================================================================\n"""\n❌ BAD Example (DON'T DO THIS):\n\nimport hvac\n\n# ❌ HARDCODED — never commit these values!\nclient = hvac.Client(\n    url='http://vault.example.com:8200',\n    token='s.abc123def456',  # ❌ Tokens expire! Hardcoding breaks\n)\n# ❌ No check if authenticated\nsecret = client.secrets.kv.v2.read_secret_version(path='my-app/config')\ndb_password = secret['data']['data']['DB_PASSWORD']\n# ❌ Used in code, may get logged\nprint(f"DB Password: {db_password}")  # ❌ NEVER log secrets!\n# ❌ No lease management, no cleanup, no revocation\n"""\n# ===================================================================\n# ✅ GOOD — env-based auth, verification, proper patterns\n# ===================================================================\n"""\n"""\n```
## Constraints\n### MUST DO\n- Always communicate changes clearly in the documentation for the users.\n- Implement a rollback plan when introducing new features or changes for safety.\n\n### MUST NOT DO\n- Do not abruptly remove features without prior notice — always give users time to adapt.\n- Avoid vague guidance on transitions; provide clear paths for users to follow.\n
HVAC is the official Python client for HashiCorp Vault.

Authentication methods supported:
- Token: VAULT_TOKEN env var or explicit token parameter
- AppRole: role_id + secret_id (machine identity)
- LDAP: username/password against LDAP/Active Directory
- Userpass: internal Vault username/password
- Kubernetes: service account JWT for K8s pods
- OIDC: OAuth2/OIDC external identity providers
- AWS IAM: AWS authentication using signature

Version: hvac >= 2.4.0
Python >= 3.8
"""

from __future__ import annotations

import os
import json
import logging
import time
import base64
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Callable

import hvac
from hvac import Client as VaultClient
from hvac.exceptions import (
    InvalidRequest,
    VaultError,
    Forbidden,
    Unauthorized,
    PathNotFound,
)

logger = logging.getLogger(__name__)

# ===================================================================
# ❌ BAD — hardcoded addresses/tokens, no verification, no cleanup
# ===================================================================

"""
❌ BAD Example (DON'T DO THIS):

import hvac

# ❌ HARDCODED — never commit these values!
client = hvac.Client(
    url='http://vault.example.com:8200',
    token='s.abc123def456',  # ❌ Tokens expire! Hardcoding breaks
)

# ❌ No check if authenticated
secret = client.secrets.kv.v2.read_secret_version(path='my-app/config')
db_password = secret['data']['data']['DB_PASSWORD']

# ❌ Used in code, may get logged
print(f"DB Password: {db_password}")  # ❌ NEVER log secrets!

# ❌ No lease management, no cleanup, no revocation
"""

# ===================================================================
# ✅ GOOD — env-based auth, verification, proper patterns
# ===================================================================


def get_vault_addr() -> str:
    """Get Vault address from environment.

    Reads: VAULT_ADDR (required)

    Returns:
        Vault server URL.

    Raises:
        ValueError: If VAULT_ADDR not set.
    """
    vault_addr = os.environ.get('VAULT_ADDR')
    if not vault_addr:
        raise ValueError("VAULT_ADDR environment variable is required")
    return vault_addr


def get_vault_token() -> Optional[str]:
    """Get Vault token from environment or token file.

    Reads in order:
    1. VAULT_TOKEN environment variable
    2. ~/.vault-token (Vault CLI token file)

    Returns:
        Token string or None if not found.
    """
    # Check env var first
    token = os.environ.get('VAULT_TOKEN')
    if token:
        return token

    # Check ~/.vault-token file (used by Vault CLI)
    token_file = os.path.expanduser('~/.vault-token')
    if os.path.exists(token_file):
        try:
            with open(token_file, 'r') as f:
                return f.read().strip()
        except IOError:
            pass

    return None


def create_vault_client(
    url: Optional[str] = None,
    token: Optional[str] = None,
    verify: bool = True,
    cert: Optional[tuple] = None,
) -> VaultClient:
    """Create a basic Vault client with token authentication.

    Args:
        url: Vault URL (reads VAULT_ADDR if None).
        token: Vault token (reads VAULT_TOKEN/.vault-token if None).
        verify: Whether to verify TLS certificates.
        cert: Optional client cert tuple for mTLS.

    Returns:
        hvac Client instance.

    Raises:
        ValueError: If url or token not available.
    """
    vault_url = url or get_vault_addr()
    vault_token = token or get_vault_token()

    if not vault_token:
        raise ValueError(
            "Vault token not found. Set VAULT_TOKEN or login with Vault CLI."
        )

    client = VaultClient(
        url=vault_url,
        token=vault_token,
        verify=verify,
        cert=cert,
    )

    return client


def authenticate_approle(
    role_id: str,
    secret_id: str,
    url: Optional[str] = None,
    mount_point: str = 'approle',
    verify: bool = True,
) -> VaultClient:
    """Authenticate using AppRole (machine/service identity).

    AppRole is the recommended auth method for applications/services.
    It provides: role_id (similar to username), secret_id (similar to password).

    Best practices:
    - Deliver secret_id via response wrapping (one-time use)
    - Set short TTL on generated tokens
    - Use periodic tokens for long-running services that can self-renew

    Args:
        role_id: AppRole Role ID.
        secret_id: AppRole Secret ID.
        url: Vault URL.
        mount_point: AppRole auth mount path (default 'approle').
        verify: TLS verification.

    Returns:
        Authenticated hvac Client.
    """
    vault_url = url or get_vault_addr()

    # Create unauthenticated client first
    client = VaultClient(url=vault_url, verify=verify)

    # Authenticate via AppRole
    login_response = client.auth.approle.login(
        role_id=role_id,
        secret_id=secret_id,
        mount_point=mount_point,
    )

    # Extract token from response
    client.token = login_response['auth']['client_token']

    logger.info(
        "Authenticated via AppRole: policies=%s, ttl=%ds",
        login_response['auth'].get('policies'),
        login_response['auth'].get('lease_duration'),
    )

    return client


def authenticate_ldap(
    username: str,
    password: str,
    url: Optional[str] = None,
    mount_point: str = 'ldap',
    verify: bool = True,
) -> VaultClient:
    """Authenticate using LDAP/Active Directory.

    Useful for human users authenticating with corporate credentials.

    Args:
        username: LDAP username.
        password: LDAP password.
        url: Vault URL.
        mount_point: LDAP auth mount path.
        verify: TLS verification.

    Returns:
        Authenticated hvac Client.
    """
    vault_url = url or get_vault_addr()

    client = VaultClient(url=vault_url, verify=verify)

    login_response = client.auth.ldap.login(
        username=username,
        password=password,
        mount_point=mount_point,
    )

    client.token = login_response['auth']['client_token']

    logger.info(
        "Authenticated via LDAP: user=%s, policies=%s",
        username,
        login_response['auth'].get('policies'),
    )

    return client


def authenticate_kubernetes(
    role: str,
    jwt_path: str = '/var/run/secrets/kubernetes.io/serviceaccount/token',
    url: Optional[str] = None,
    mount_point: str = 'kubernetes',
    verify: bool = True,
) -> VaultClient:
    """Authenticate using Kubernetes service account JWT.

    For pods running in Kubernetes. Uses the default service account token
    mounted at /var/run/secrets/kubernetes.io/serviceaccount/token.

    Args:
        role: Kubernetes auth role in Vault.
        jwt_path: Path to JWT token file.
        url: Vault URL.
        mount_point: Kubernetes auth mount path.
        verify: TLS verification.

    Returns:
        Authenticated hvac Client.
    """
    vault_url = url or get_vault_addr()

    # Read JWT from Kubernetes-mounted path
    with open(jwt_path, 'r') as f:
        jwt = f.read().strip()

    client = VaultClient(url=vault_url, verify=verify)

    login_response = client.auth.kubernetes.login(
        role=role,
        jwt=jwt,
        mount_point=mount_point,
    )

    client.token = login_response['auth']['client_token']

    logger.info(
        "Authenticated via Kubernetes: role=%s, policies=%s",
        role,
        login_response['auth'].get('policies'),
    )

    return client


def verify_client_authenticated(client: VaultClient) -> bool:
    """Verify that the Vault client is authenticated and Vault is healthy.

    Args:
        client: hvac Client instance.

    Returns:
        True if healthy and authenticated.

    Raises:
        RuntimeError: If health check fails.
    """
    # Read health status (unauthenticated endpoint)
    try:
        health = client.sys.read_health_status()
        initialized = health.get('initialized', False)
        sealed = health.get('sealed', True)
        standby = health.get('standby', False)

        if not initialized:
            raise RuntimeError("Vault is not initialized")
        if sealed:
            raise RuntimeError("Vault is sealed")

        # Now check authentication (token lookup)
        try:
            token_info = client.auth.token.lookup_self()
            logger.info(
                "Vault authentication verified: path=%s, policies=%s, renewable=%s",
                token_info['data'].get('path'),
                token_info['data'].get('policies'),
                token_info['data'].get('renewable'),
            )
            return True
        except Unauthorized:
            raise RuntimeError("Vault token is invalid or expired")
        except Forbidden:
            raise RuntimeError("Vault token lacks permission to look itself up")

    except VaultError as e:
        raise RuntimeError(f"Vault health check failed: {e}") from e


def revoke_self_token(client: VaultClient) -> None:
    """Revoke the current token and cleanup.

    Call this when done with the client (especially important for
    short-lived tokens). Use in try/finally pattern.

    Args:
        client: Authenticated hvac Client.
    """
    try:
        client.auth.token.revoke_self()
        logger.info("Revoked current Vault token")
    except VaultError as e:
        logger.warning("Failed to revoke token: %s", e)
"""
```
