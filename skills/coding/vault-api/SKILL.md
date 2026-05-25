---
name: vault-api
description: Implements HashiCorp Vault API integration (KV Secrets Engine, PKI, Transit,
  Auth Methods, Leasing & Renewal) using hvac Python SDK v2.4+ with proper authentication,
  secret leasing, TTL management, and encryption as a service patterns.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: hashicorp vault, hvac python, vault kv secrets, vault pki, vault transit,
    how do i use vault, vault leasing, secret management
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
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - do-dont
  - examples
  related-skills: coding-aws-iam, coding-onepassword-api, coding-entra-id-api
------
# HashiCorp Vault Integration (Secrets Management)

Implements production-grade HashiCorp Vault integration using the `hvac` Python SDK v2.4+. When loaded, this skill makes the model implement KV (Key/Value) secrets engine v1/v2 operations, Transit (encryption as a service), PKI (certificate generation), AppRole authentication, Token auth, LDAP/Kubernetes auth methods, secret leasing and renewal, TTL management, and response wrapping. All implementations follow Vault best practices: use environment variables for auth, proper token lifecycle management (lease renewal, revoke on exit), short-lived dynamic secrets instead of long-lived credentials, encryption/decryption via Transit (never roll your own crypto), and wrapping tokens for secure one-time delivery.

## TL;DR Checklist

- [ ] Use `hvac.Client(url=..., token=...)` or auth method for initializing
- [ ] Read `VAULT_ADDR` and `VAULT_TOKEN` from environment (never hardcode)
- [ ] KV v2: `client.secrets.kv.v2.read_secret_version()`, `create_or_update_secret()`
- [ ] KV v1: `client.secrets.kv.v1.read_secret()`, `create_or_update_secret()`
- [ ] Transit: `client.secrets.transit.encrypt_data()`, `decrypt_data()`
- [ ] PKI: `client.secrets.pki.generate_certificate()`, `sign_intermediate()`
- [ ] Auth methods: `client.auth.approle.login()`, `token.create()`, `ldap.login()`, `kubernetes.login()`
- [ ] Leasing: `client.sys.renew_secret()`, `sys.renew_token()`, `sys.revoke_secret()`
- [ ] Wrapping: `client.secrets.kv.v2.create_or_update_secret(..., wrap_ttl='60s')` then `client.sys.unwrap()`
- [ ] Always revoke leased secrets when done (try/finally pattern)
- [ ] Never log or print secrets or tokens
- [ ] Use short TTLs and rotate/renew periodically

---

## When to Use

Use this skill when:

- Centralizing secrets management across applications and teams
- Storing and retrieving API keys, database credentials, passwords (KV secrets)
- Implementing encryption as a service (EaaS) via Transit engine
- Generating dynamic database credentials that auto-expire
- Running an internal PKI (Public Key Infrastructure) for certificates
- Authenticating applications via AppRole, Kubernetes, LDAP, or OIDC
- Implementing secure application-to-application credential delivery
- Creating service tokens with specific policies and TTLs
- Wrapping secrets for secure one-time delivery
- Rotating secrets without application code changes
- Establishing dynamic secrets (DB, AWS, Azure, GCP credentials)

---

## When NOT to Use

- For AWS service identities and roles — use `coding-aws-iam`
- For 1Password human-centric password management — use `coding-onepassword-api`
- For Microsoft Entra ID identities — use `coding-entra-id-api`
- For simple environment variable management (Vault is overkill)
- When you need a password manager for humans (1Password, LastPass, etc.)
- For static configuration values that aren't actually secrets
- As a primary database (use PostgreSQL, MongoDB, etc. instead)
- For high-volume caching (use Redis, Memcached instead)

---

## Core Workflow

1. **Initialize Vault Client** — Create `hvac.Client()` from environment variables `VAULT_ADDR` and `VAULT_TOKEN`, or use auth method (AppRole, LDAP, Kubernetes, etc.). **Checkpoint:** Verify connection with `client.is_authenticated()` or simple `sys.read_health_status()`.

2. **Choose Authentication Method** — Select appropriate auth:
   - Development/local: Token auth (`VAULT_TOKEN`)
   - Apps/services: AppRole (`role_id` + `secret_id` or response wrapping)
   - Kubernetes: Kubernetes auth using service account JWT
   - Human users: LDAP, Userpass, OIDC
   **Checkpoint:** Each auth method returns a token with associated policies — verify policies grant correct access.

3. **KV Secrets Operations** — Use KV v2 for versioned secrets:
   - `client.secrets.kv.v2.create_or_update_secret()`
   - `client.secrets.kv.v2.read_secret_version()`
   - `client.secrets.kv.v2.delete_latest_version_of_secret()`
   - `client.secrets.kv.v2.destroy_secret_versions()`
   For KV v1: Use `client.secrets.kv.v1.*` methods.
   **Checkpoint:** Always check `data['data']['key']` (v2 wraps in extra `data` level).

4. **Transit (Encryption as a Service)** — Create key with `client.secrets.transit.create_key()`, encrypt data with `encrypt_data(name, plaintext=base64_text)`, decrypt with `decrypt_data(name, ciphertext=ciphertext)`. Also supports: rewrap, datakey generation, signing/verification, hashing, HMAC. **Checkpoint:** Plaintext must be base64-encoded before encryption.

5. **Dynamic Secrets & Leasing** — Request dynamic credentials (DB, AWS, etc.). Response contains `lease_id`, `lease_duration`, `renewable`. Renew before expiry with `client.sys.renew_secret(lease_id)`. Revoke when done with `client.sys.revoke_secret(lease_id)`. Use try/finally pattern. **Checkpoint:** Most leases are renewable up to `max_ttl` — after that, must get fresh credentials.

6. **Response Wrapping** — For secure one-time secret delivery: create secret with `wrap_ttl='60s'` → receive `wrap_info.token`. Unwrap using `client.sys.unwrap(wrapping_token)`. Can only unwrap once. **Checkpoint:** Verify `wrap_info.creation_path` and `wrap_info.ttl` after unwrapping to ensure correct source.

7. **Token & Lease Management** — Best practices:
   - Use minimum required policies (least privilege)
   - Set shortest practical TTL on tokens/secrets
   - Renew leases before `lease_duration` elapses (use buffer)
   - Always revoke when no longer needed
   - Never log tokens or secrets
   **Checkpoint:** Set up periodic renewal task or use HVAC's `AutoAuth` if available.

---

## Implementation Patterns

### Pattern 1: Vault Client Initialization (BAD vs GOOD)

```python
"""HashiCorp Vault hvac SDK initialization patterns.

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
```

### Pattern 2: KV Secrets Engine (v1 and v2)

```python
"""Key/Value (KV) Secrets Engine operations.

KV is the most commonly used secrets engine for static secrets:
- API keys, passwords, config values
- Versioned secrets (v2) or simple key-value (v1)

Version 2 (recommended):
- Versioning, rollback, check-and-set (CAS)
- Path structure: secret/data/{path}
- Wrapped response: data.data.key

Version 1 (legacy):
- Simple key-value, no versioning
- Path structure: secret/{path}
- Response: data.key
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

import hvac
from hvac.exceptions import PathNotFound, InvalidRequest, VaultError

logger = logging.getLogger(__name__)


# ===================================================================
# KV v2 (Versioned Secrets) — RECOMMENDED
# ===================================================================


def kv2_get_secret(
    client: hvac.Client,
    path: str,
    version: Optional[int] = None,
    mount_point: str = 'secret',
) -> Dict[str, Any]:
    """Read a secret from KV v2 secrets engine.

    Important: KV v2 response structure has nested 'data':
        response['data']['data']['KEY']
    NOT: response['data']['KEY']

    Args:
        client: hvac Client.
        path: Secret path without 'data/' prefix.
        version: Optional specific version to read (reads latest if None).
        mount_point: KV engine mount path (default 'secret').

    Returns:
        Dict of secret key-value pairs.

    Raises:
        KeyError: If path not found.
        RuntimeError: For other Vault errors.
    """
    try:
        response = client.secrets.kv.v2.read_secret_version(
            path=path,
            version=version,
            mount_point=mount_point,
        )

        # KV v2: response['data']['data'] contains the actual secrets
        secret_data = response.get('data', {}).get('data', {})

        if not secret_data:
            logger.warning("KV v2 secret at path '%s' has no data", path)

        return secret_data

    except PathNotFound:
        raise KeyError(f"KV v2 secret not found at path: {mount_point}/{path}")
    except VaultError as e:
        raise RuntimeError(f"Failed to read KV v2 secret '{path}': {e}") from e


def kv2_create_or_update_secret(
    client: hvac.Client,
    path: str,
    secrets: Dict[str, Any],
    cas: Optional[int] = None,
    mount_point: str = 'secret',
) -> int:
    """Create or update a KV v2 secret.

    Creates new version each time. Use cas (Check-And-Set) parameter
    for optimistic concurrency control.

    Args:
        client: hvac Client.
        path: Secret path.
        secrets: Dict of key-value pairs to store.
        cas: Optional version for Check-And-Set (fails if current version differs).
        mount_point: KV engine mount path.

    Returns:
        New version number created.
    """
    try:
        response = client.secrets.kv.v2.create_or_update_secret(
            path=path,
            secret=secrets,
            cas=cas,
            mount_point=mount_point,
        )

        version = response.get('data', {}).get('version', 0)
        created_time = response.get('data', {}).get('created_time')

        logger.info(
            "Created/updated KV v2 secret: path=%s, version=%d, created=%s",
            path,
            version,
            created_time,
        )

        return version

    except InvalidRequest as e:
        if cas is not None:
            raise RuntimeError(
                f"Check-And-Set failed for path '{path}': CAS={cas} but current version differs"
            ) from e
        raise RuntimeError(f"Invalid request for KV v2 secret '{path}': {e}") from e
    except VaultError as e:
        raise RuntimeError(f"Failed to write KV v2 secret '{path}': {e}") from e


def kv2_delete_latest_version(
    client: hvac.Client,
    path: str,
    mount_point: str = 'secret',
) -> None:
    """Delete the latest version of a KV v2 secret.

    This is a "soft delete" — can be undeleted.
    Use destroy_secret_versions() for permanent deletion.

    Args:
        client: hvac Client.
        path: Secret path.
        mount_point: KV engine mount path.
    """
    try:
        client.secrets.kv.v2.delete_latest_version_of_secret(
            path=path,
            mount_point=mount_point,
        )
        logger.info("Deleted latest version of KV v2 secret: path=%s", path)
    except VaultError as e:
        raise RuntimeError(f"Failed to delete KV v2 secret '{path}': {e}") from e


def kv2_undelete_versions(
    client: hvac.Client,
    path: str,
    versions: List[int],
    mount_point: str = 'secret',
) -> None:
    """Undelete (restore) specific versions of a KV v2 secret.

    Args:
        client: hvac Client.
        path: Secret path.
        versions: List of version numbers to undelete.
        mount_point: KV engine mount path.
    """
    try:
        client.secrets.kv.v2.undelete_secret_versions(
            path=path,
            versions=versions,
            mount_point=mount_point,
        )
        logger.info(
            "Undeleted KV v2 secret versions: path=%s, versions=%s",
            path,
            versions,
        )
    except VaultError as e:
        raise RuntimeError(
            f"Failed to undelete KV v2 secret '{path}' versions: {e}"
        ) from e


def kv2_destroy_versions(
    client: hvac.Client,
    path: str,
    versions: List[int],
    mount_point: str = 'secret',
) -> None:
    """Permanently destroy specific versions of a KV v2 secret.

    This is PERMANENT and cannot be undone.

    Args:
        client: hvac Client.
        path: Secret path.
        versions: List of version numbers to destroy.
        mount_point: KV engine mount path.
    """
    try:
        client.secrets.kv.v2.destroy_secret_versions(
            path=path,
            versions=versions,
            mount_point=mount_point,
        )
        logger.warning(
            "PERMANENTLY DESTROYED KV v2 secret versions: path=%s, versions=%s",
            path,
            versions,
        )
    except VaultError as e:
        raise RuntimeError(
            f"Failed to destroy KV v2 secret '{path}' versions: {e}"
        ) from e


def kv2_list_secrets(
    client: hvac.Client,
    path: str = '',
    mount_point: str = 'secret',
) -> List[str]:
    """List secrets at a path in KV v2 engine.

    Args:
        client: hvac Client.
        path: Path to list (empty for root).
        mount_point: KV engine mount path.

    Returns:
        List of secret names/subdirectories at the path.
    """
    try:
        response = client.secrets.kv.v2.list_secrets(
            path=path,
            mount_point=mount_point,
        )
        keys = response.get('data', {}).get('keys', [])
        return keys
    except PathNotFound:
        return []
    except VaultError as e:
        raise RuntimeError(f"Failed to list KV v2 secrets at '{path}': {e}") from e


def kv2_get_secret_metadata(
    client: hvac.Client,
    path: str,
    mount_point: str = 'secret',
) -> Dict[str, Any]:
    """Get metadata about a KV v2 secret.

    Includes: created_time, current_version, max_versions, old versions, etc.

    Args:
        client: hvac Client.
        path: Secret path.
        mount_point: KV engine mount path.

    Returns:
        Dict of metadata.
    """
    try:
        response = client.secrets.kv.v2.read_secret_metadata(
            path=path,
            mount_point=mount_point,
        )
        return response.get('data', {})
    except PathNotFound:
        raise KeyError(f"KV v2 secret metadata not found: {path}")
    except VaultError as e:
        raise RuntimeError(f"Failed to get KV v2 metadata for '{path}': {e}") from e


# ===================================================================
# KV v1 (Legacy)
# ===================================================================


def kv1_get_secret(
    client: hvac.Client,
    path: str,
    mount_point: str = 'kv',
) -> Dict[str, Any]:
    """Read a secret from KV v1 secrets engine (legacy, non-versioned).

    KV v1 response structure is simpler:
        response['data']['KEY']

    Args:
        client: hvac Client.
        path: Secret path.
        mount_point: KV v1 mount path (often 'kv' or 'secret-v1').

    Returns:
        Dict of secret key-value pairs.
    """
    try:
        response = client.secrets.kv.v1.read_secret(
            path=path,
            mount_point=mount_point,
        )
        return response.get('data', {})
    except PathNotFound:
        raise KeyError(f"KV v1 secret not found: {path}")
    except VaultError as e:
        raise RuntimeError(f"Failed to read KV v1 secret '{path}': {e}") from e


def kv1_create_or_update_secret(
    client: hvac.Client,
    path: str,
    secrets: Dict[str, Any],
    mount_point: str = 'kv',
) -> None:
    """Create or update a KV v1 secret (overwrites).

    Args:
        client: hvac Client.
        path: Secret path.
        secrets: Key-value pairs.
        mount_point: KV v1 mount path.
    """
    try:
        client.secrets.kv.v1.create_or_update_secret(
            path=path,
            secret=secrets,
            mount_point=mount_point,
        )
        logger.info("Created/updated KV v1 secret: path=%s", path)
    except VaultError as e:
        raise RuntimeError(f"Failed to write KV v1 secret '{path}': {e}") from e


# ===================================================================
# Secret Wrapping (Secure One-Time Delivery)
# ===================================================================


def wrap_secret_with_ttl(
    client: hvac.Client,
    path: str,
    secrets: Dict[str, Any],
    wrap_ttl: str = '60s',
    mount_point: str = 'secret',
) -> Dict[str, Any]:
    """Create a wrapped secret (response wrapping / cubbyhole response).

    Response wrapping is a Vault feature that enables secure one-time
    delivery of secrets. The secret is placed in a single-use token
    that can only be unwrapped once.

    Use case: Delivering AppRole secret_id securely, passing credentials
    between services without exposing them.

    Args:
        client: hvac Client.
        path: Secret path in KV v2.
        secrets: Secrets to store and wrap.
        wrap_ttl: TTL for the wrapping token (e.g., '60s', '5m', '1h').
        mount_point: KV v2 mount path.

    Returns:
        Dict with: token, accessor, ttl, creation_path, wrapped.
    """
    try:
        # Use HVAC's wrap_ttl option (sets X-Vault-Wrap-TTL header)
        response = client.secrets.kv.v2.create_or_update_secret(
            path=path,
            secret=secrets,
            mount_point=mount_point,
        )

        # Check if response contains wrap_info
        if 'wrap_info' in response:
            wrap_info = response['wrap_info']
            logger.info(
                "Wrapped secret: path=%s, wrap_ttl=%s, token=%s",
                path,
                wrap_ttl,
                wrap_info.get('token'),
            )
            return {
                'wrapping_token': wrap_info.get('token'),
                'accessor': wrap_info.get('accessor'),
                'ttl': wrap_info.get('ttl'),
                'creation_time': wrap_info.get('creation_time'),
                'creation_path': wrap_info.get('creation_path'),
                'wrapped': True,
            }
        else:
            # Not wrapped — response doesn't have wrap_info
            logger.warning("Secret was NOT wrapped (check server config)")
            return {
                'version': response.get('data', {}).get('version'),
                'wrapped': False,
            }

    except VaultError as e:
        raise RuntimeError(f"Failed to wrap secret: {e}") from e


def unwrap_token(
    client: hvac.Client,
    wrapping_token: str,
) -> Dict[str, Any]:
    """Unwrap a response-wrapping token to retrieve the secret.

    A wrapping token can only be unwrapped ONCE. After unwrapping,
    the token is destroyed and the secret is returned.

    Args:
        client: hvac Client (can be unauthenticated or with different token).
        wrapping_token: The response-wrapping token.

    Returns:
        The unwrapped secret data.
    """
    try:
        # unwrap() returns the original response
        response = client.sys.unwrap(wrapping_token)

        logger.info("Unwrapped token successfully")

        # Return the data part
        if 'data' in response:
            return response['data']
        return response

    except VaultError as e:
        raise RuntimeError(f"Failed to unwrap token: {e}") from e


def lookup_wrapping_token(
    client: hvac.Client,
    wrapping_token: str,
) -> Dict[str, Any]:
    """Lookup info about a wrapping token without unwrapping it.

    Useful to verify:
    - Token exists and is valid
    - What path it was created from
    - TTL remaining

    Args:
        client: hvac Client.
        wrapping_token: Response-wrapping token.

    Returns:
        Token lookup info.
    """
    try:
        # Use token accessor to lookup (doesn't consume the token)
        response = client.sys.wrap_token_lookup(wrapping_token)
        return response.get('data', {})
    except VaultError as e:
        raise RuntimeError(f"Failed to lookup wrapping token: {e}") from e
```

### Pattern 3: Transit Engine (Encryption as a Service)

```python
"""Transit Secrets Engine — Encryption as a Service.

Transit is Vault's "encryption as a service" engine.
It handles encryption/decryption, key management, key rotation,
without applications needing to:
- Store/manage encryption keys
- Implement cryptography (easy to get wrong!)
- Handle key rotation

Key Transit features:
1. encrypt/decrypt data
2. Sign/verify data
3. Hash/HMAC
4. Data key generation (envelope encryption)
5. Key rotation without re-encrypting all data
6. Key versioning
7. Import keys (bring your own key / BYOK)
"""

from __future__ import annotations

import base64
import logging
from typing import Any, Dict, List, Optional

import hvac
from hvac.exceptions import VaultError

logger = logging.getLogger(__name__)


def transit_create_key(
    client: hvac.Client,
    key_name: str,
    key_type: str = 'aes256-gcm96',
    derived: bool = False,
    exportable: bool = False,
    allow_plaintext_backup: bool = False,
    auto_rotate_period: Optional[str] = None,
    mount_point: str = 'transit',
) -> None:
    """Create a new encryption key in Transit engine.

    Key types:
    - aes256-gcm96: AES-256-GCM (default, recommended)
    - aes128-gcm96: AES-128-GCM
    - chacha20-poly1305: ChaCha20-Poly1305
    - ed25519: Ed25519 for signing
    - ecdsa-p256/ecdsa-p384/ecdsa-p521: ECDSA for signing
    - rsa-2048/rsa-3072/rsa-4096: RSA for encryption/signing

    Args:
        client: hvac Client.
        key_name: Name for the key.
        key_type: Key type algorithm.
        derived: Whether key supports derivation (context parameter).
        exportable: Whether key can be exported (security tradeoff).
        allow_plaintext_backup: Allow backup/restore of key.
        auto_rotate_period: Auto rotation period (e.g., '24h', '8760h').
        mount_point: Transit engine mount path.
    """
    try:
        client.secrets.transit.create_key(
            name=key_name,
            key_type=key_type,
            derived=derived,
            exportable=exportable,
            allow_plaintext_backup=allow_plaintext_backup,
            auto_rotate_period=auto_rotate_period,
            mount_point=mount_point,
        )
        logger.info(
            "Created Transit key: name=%s, type=%s, derived=%s",
            key_name,
            key_type,
            derived,
        )
    except VaultError as e:
        raise RuntimeError(f"Failed to create Transit key '{key_name}': {e}") from e


def transit_read_key(
    client: hvac.Client,
    key_name: str,
    mount_point: str = 'transit',
) -> Dict[str, Any]:
    """Read metadata about a Transit key.

    Args:
        client: hvac Client.
        key_name: Key name.
        mount_point: Transit engine mount path.

    Returns:
        Dict of key metadata.
    """
    try:
        response = client.secrets.transit.read_key(
            name=key_name,
            mount_point=mount_point,
        )
        return response.get('data', {}).get('keys', {}).get(key_name, {})
    except VaultError as e:
        raise RuntimeError(f"Failed to read Transit key '{key_name}': {e}") from e


def transit_list_keys(
    client: hvac.Client,
    mount_point: str = 'transit',
) -> List[str]:
    """List all Transit keys.

    Args:
        client: hvac Client.
        mount_point: Transit engine mount path.

    Returns:
        List of key names.
    """
    try:
        response = client.secrets.transit.list_keys(mount_point=mount_point)
        keys = response.get('data', {}).get('keys', [])
        return keys
    except VaultError as e:
        raise RuntimeError(f"Failed to list Transit keys: {e}") from e


def transit_encrypt(
    client: hvac.Client,
    key_name: str,
    plaintext: str | bytes,
    key_version: Optional[int] = None,
    context: Optional[str] = None,  # Required if key is derived=True
    mount_point: str = 'transit',
) -> str:
    """Encrypt data using a Transit key.

    IMPORTANT: Plaintext must be base64-encoded!

    The returned ciphertext looks like:
        vault:v1:abc123def456...
      - vault: fixed prefix
      - v1: key version used
      - base64: actual ciphertext

    Args:
        client: hvac Client.
        key_name: Transit key name.
        plaintext: Data to encrypt (string or bytes; will be base64-encoded).
        key_version: Optional specific key version to use.
        context: Context for derived keys (required if key was created with derived=True).
        mount_point: Transit engine mount path.

    Returns:
        Ciphertext string (vault:vN:... format).
    """
    # Convert to bytes and base64-encode
    if isinstance(plaintext, str):
        plaintext_bytes = plaintext.encode('utf-8')
    else:
        plaintext_bytes = plaintext

    # Transit requires base64-encoded plaintext
    plaintext_b64 = base64.b64encode(plaintext_bytes).decode('utf-8')

    try:
        response = client.secrets.transit.encrypt_data(
            name=key_name,
            plaintext=plaintext_b64,
            key_version=key_version,
            context=context,
            mount_point=mount_point,
        )

        ciphertext = response['data']['ciphertext']

        logger.debug(
            "Encrypted data with Transit: key=%s, version=%s",
            key_name,
            key_version,
        )

        return ciphertext

    except VaultError as e:
        raise RuntimeError(
            f"Failed to encrypt with Transit key '{key_name}': {e}"
        ) from e


def transit_decrypt(
    client: hvac.Client,
    key_name: str,
    ciphertext: str,
    context: Optional[str] = None,
    mount_point: str = 'transit',
) -> str:
    """Decrypt data using a Transit key.

    Automatically uses the correct key version from ciphertext.

    Args:
        client: hvac Client.
        key_name: Transit key name.
        ciphertext: Ciphertext in vault:vN:... format.
        context: Context for derived keys.
        mount_point: Transit engine mount path.

    Returns:
        Decrypted plaintext string (UTF-8 decoded).
    """
    try:
        response = client.secrets.transit.decrypt_data(
            name=key_name,
            ciphertext=ciphertext,
            context=context,
            mount_point=mount_point,
        )

        # Response contains base64-encoded plaintext
        plaintext_b64 = response['data']['plaintext']
        plaintext_bytes = base64.b64decode(plaintext_b64)
        plaintext = plaintext_bytes.decode('utf-8')

        logger.debug("Decrypted data with Transit: key=%s", key_name)

        return plaintext

    except VaultError as e:
        raise RuntimeError(
            f"Failed to decrypt with Transit key '{key_name}': {e}"
        ) from e


def transit_encrypt_batch(
    client: hvac.Client,
    key_name: str,
    plaintexts: List[str | bytes],
    key_version: Optional[int] = None,
    context: Optional[str] = None,
    mount_point: str = 'transit',
) -> List[str]:
    """Encrypt multiple values in a single request.

    More efficient than multiple separate encrypt calls.

    Args:
        client: hvac Client.
        key_name: Transit key name.
        plaintexts: List of values to encrypt.
        key_version: Optional key version.
        context: Context for derived keys.
        mount_point: Transit engine mount path.

    Returns:
        List of ciphertexts in same order.
    """
    # Batch format: list of dicts with 'plaintext' key
    batch_input = []
    for pt in plaintexts:
        if isinstance(pt, str):
            pt_bytes = pt.encode('utf-8')
        else:
            pt_bytes = pt
        pt_b64 = base64.b64encode(pt_bytes).decode('utf-8')
        batch_input.append({'plaintext': pt_b64})

    try:
        response = client.secrets.transit.encrypt_data(
            name=key_name,
            batch_input=batch_input,
            key_version=key_version,
            context=context,
            mount_point=mount_point,
        )

        batch_results = response['data']['batch_results']
        ciphertexts = [result['ciphertext'] for result in batch_results]

        logger.debug("Encrypted batch of %d items with Transit", len(ciphertexts))

        return ciphertexts

    except VaultError as e:
        raise RuntimeError(
            f"Failed to encrypt batch with Transit key '{key_name}': {e}"
        ) from e


def transit_rotate_key(
    client: hvac.Client,
    key_name: str,
    mount_point: str = 'transit',
) -> int:
    """Rotate a Transit key (create new version).

    After rotation:
    - New encryptions use the NEW version by default
    - Old ciphertexts can STILL be decrypted (old key versions kept)
    - Use rewrap() to upgrade old ciphertexts to new key version

    Args:
        client: hvac Client.
        key_name: Transit key name.
        mount_point: Transit engine mount path.

    Returns:
        New key version number.
    """
    try:
        response = client.secrets.transit.rotate_key(
            name=key_name,
            mount_point=mount_point,
        )

        # Get the new version
        key_info = transit_read_key(client, key_name, mount_point)
        latest_version = key_info.get('latest_version', 0)

        logger.info(
            "Rotated Transit key: name=%s, new_version=%d",
            key_name,
            latest_version,
        )

        return latest_version

    except VaultError as e:
        raise RuntimeError(f"Failed to rotate Transit key '{key_name}': {e}") from e


def transit_rewrap(
    client: hvac.Client,
    key_name: str,
    ciphertext: str,
    key_version: Optional[int] = None,
    context: Optional[str] = None,
    mount_point: str = 'transit',
) -> str:
    """Rewrap ciphertext with latest (or specified) key version.

    Use after key rotation to upgrade old ciphertexts without
    exposing the plaintext.

    Args:
        client: hvac Client.
        key_name: Transit key name.
        ciphertext: Old ciphertext to rewrap.
        key_version: New key version to use (default latest).
        context: Context for derived keys.
        mount_point: Transit engine mount path.

    Returns:
        New ciphertext encrypted with new key version.
    """
    try:
        response = client.secrets.transit.rewrap_data(
            name=key_name,
            ciphertext=ciphertext,
            key_version=key_version,
            context=context,
            mount_point=mount_point,
        )

        new_ciphertext = response['data']['ciphertext']

        logger.info(
            "Rewrapped ciphertext with Transit: key=%s",
            key_name,
        )

        return new_ciphertext

    except VaultError as e:
        raise RuntimeError(
            f"Failed to rewrap with Transit key '{key_name}': {e}"
        ) from e


def transit_generate_data_key(
    client: hvac.Client,
    key_name: str,
    key_type: str = 'plaintext',  # or 'wrapped'
    bits: int = 256,
    context: Optional[str] = None,
    mount_point: str = 'transit',
) -> Dict[str, str]:
    """Generate a data key (for envelope encryption).

    Returns BOTH:
    - Plaintext data key (use to encrypt locally, then discard)
    - Ciphertext of data key (store this alongside your encrypted data)

    Decryption pattern:
    1. Retrieve ciphertext of data key
    2. Call transit_decrypt() to get plaintext key
    3. Use plaintext key to decrypt your actual data
    4. Discard plaintext key from memory

    Args:
        client: hvac Client.
        key_name: Transit key name.
        key_type: 'plaintext' (returns both) or 'wrapped' (only ciphertext).
        bits: Key size (128, 256, 512).
        context: Context for derived keys.
        mount_point: Transit engine mount path.

    Returns:
        Dict with: plaintext (base64), ciphertext.
    """
    try:
        response = client.secrets.transit.generate_data_key(
            name=key_name,
            key_type=key_type,
            bits=bits,
            context=context,
            mount_point=mount_point,
        )

        result = {
            'plaintext': response['data'].get('plaintext'),  # base64-encoded
            'ciphertext': response['data'].get('ciphertext'),
        }

        logger.info(
            "Generated data key with Transit: name=%s, bits=%d",
            key_name,
            bits,
        )

        return result

    except VaultError as e:
        raise RuntimeError(
            f"Failed to generate data key with Transit '{key_name}': {e}"
        ) from e


def transit_sign(
    client: hvac.Client,
    key_name: str,
    data: str | bytes,
    key_version: Optional[int] = None,
    hash_algorithm: str = 'sha2-256',
    context: Optional[str] = None,
    mount_point: str = 'transit',
) -> str:
    """Sign data using an asymmetric signing key.

    Key must be of type: ed25519, ecdsa-p256, ecdsa-p384, ecdsa-p521, rsa-2048, etc.

    Args:
        client: hvac Client.
        key_name: Transit signing key name.
        data: Data to sign (string or bytes).
        key_version: Optional key version.
        hash_algorithm: Hash algorithm.
        context: Context for derived keys.
        mount_point: Transit engine mount path.

    Returns:
        Signature string.
    """
    # Base64 encode the input
    if isinstance(data, str):
        data_bytes = data.encode('utf-8')
    else:
        data_bytes = data
    data_b64 = base64.b64encode(data_bytes).decode('utf-8')

    try:
        response = client.secrets.transit.sign_data(
            name=key_name,
            hash_input=data_b64,
            key_version=key_version,
            hash_algorithm=hash_algorithm,
            context=context,
            mount_point=mount_point,
        )

        signature = response['data']['signature']

        logger.debug("Signed data with Transit: key=%s", key_name)

        return signature

    except VaultError as e:
        raise RuntimeError(
            f"Failed to sign data with Transit key '{key_name}': {e}"
        ) from e


def transit_verify_signature(
    client: hvac.Client,
    key_name: str,
    data: str | bytes,
    signature: str,
    hash_algorithm: str = 'sha2-256',
    context: Optional[str] = None,
    mount_point: str = 'transit',
) -> bool:
    """Verify a signature.

    Args:
        client: hvac Client.
        key_name: Transit signing key name.
        data: Data that was signed (string or bytes).
        signature: Signature to verify.
        hash_algorithm: Hash algorithm used.
        context: Context for derived keys.
        mount_point: Transit engine mount path.

    Returns:
        True if valid, False if invalid.
    """
    # Base64 encode the input
    if isinstance(data, str):
        data_bytes = data.encode('utf-8')
    else:
        data_bytes = data
    data_b64 = base64.b64encode(data_bytes).decode('utf-8')

    try:
        response = client.secrets.transit.verify_signed_data(
            name=key_name,
            hash_input=data_b64,
            signature=signature,
            hash_algorithm=hash_algorithm,
            context=context,
            mount_point=mount_point,
        )

        valid = response['data'].get('valid', False)

        logger.debug(
            "Verified signature with Transit: key=%s, valid=%s",
            key_name,
            valid,
        )

        return valid

    except VaultError as e:
        raise RuntimeError(
            f"Failed to verify signature with Transit key '{key_name}': {e}"
        ) from e
```

### Pattern 4: Leasing, Dynamic Secrets, and PKI

```python
"""Leasing, Dynamic Secrets, and PKI.

Vault's greatest power is DYNAMIC SECRETS:
- Secrets that are generated on-demand
- Have a limited TTL (time-to-live)
- Can be revoked immediately
- Automatically expire and clean up

Examples:
- Database credentials (username/password generated for each app instance)
- AWS IAM credentials
- SSH certificates
- X.509 certificates (PKI engine)

LEASING:
- Every dynamic secret has a lease_id
- Lease can be renewed (up to max_ttl)
- Lease should be revoked when no longer needed

PKI (Public Key Infrastructure) Engine:
- Vault acts as your internal CA
- Generate X.509 certificates on demand
- Set custom TTLs
- Support intermediate CAs
- CRL generation
"""

from __future__ import annotations

import logging
import time
from typing import Any, Callable, Dict, List, Optional

import hvac
from hvac.exceptions import VaultError

logger = logging.getLogger(__name__)


def create_lease_manager(
    client: hvac.Client,
    grace_seconds: int = 60,
) -> Dict[str, Any]:
    """Create a lease manager context for safe secret handling.

    Use in try/finally pattern:

        lease_info = request_dynamic_db_creds(...)
        try:
            # Use credentials
            conn = connect_db(
                user=lease_info['username'],
                password=lease_info['password'],
            )
        finally:
            if lease_info.get('lease_id'):
                client.sys.revoke_secret(lease_info['lease_id'])

    Args:
        client: hvac Client.
        grace_seconds: Renew before this many seconds of expiry.

    Returns:
        Placeholder dict for lease tracking.
    """
    return {
        'client': client,
        'leases': [],
        'grace_seconds': grace_seconds,
    }


def renew_lease(
    client: hvac.Client,
    lease_id: str,
    increment: Optional[int] = None,
) -> Dict[str, Any]:
    """Renew a secret lease.

    Call this BEFORE the lease expires (use grace period).
    Can only renew up to max_ttl of the secret.

    Args:
        client: hvac Client.
        lease_id: Lease ID from secret response.
        increment: Optional desired extension in seconds.

    Returns:
        Renew response with lease_duration.
    """
    try:
        response = client.sys.renew_secret(
            lease_id=lease_id,
            increment=increment,
        )

        lease_duration = response.get('auth', {}).get('lease_duration') or \
                         response.get('data', {}).get('lease_duration')

        renewable = response.get('auth', {}).get('renewable') or \
                   response.get('data', {}).get('renewable', False)

        logger.info(
            "Renewed lease: id=%s, duration=%ds, renewable=%s",
            lease_id,
            lease_duration,
            renewable,
        )

        return {
            'lease_id': lease_id,
            'lease_duration': lease_duration,
            'renewable': renewable,
        }

    except VaultError as e:
        raise RuntimeError(f"Failed to renew lease '{lease_id}': {e}") from e


def revoke_lease(
    client: hvac.Client,
    lease_id: str,
) -> None:
    """Revoke a secret lease (immediately invalidate the secret).

    Always call when secrets are no longer needed!
    Use in try/finally pattern.

    Args:
        client: hvac Client.
        lease_id: Lease ID to revoke.
    """
    try:
        client.sys.revoke_secret(lease_id=lease_id)
        logger.info("Revoked lease: id=%s", lease_id)
    except VaultError as e:
        # Don't fail the whole program if revocation fails
        logger.warning("Failed to revoke lease '%s': %s", lease_id, e)


def revoke_prefix(
    client: hvac.Client,
    prefix: str,
) -> None:
    """Revoke ALL leases matching a prefix.

    Useful for: Revoke all DB credentials from a path.

    Args:
        client: hvac Client.
        prefix: Lease path prefix (e.g., 'database/creds/').
    """
    try:
        client.sys.revoke_secret_prefix(prefix=prefix)
        logger.warning("Revoked ALL leases with prefix: %s", prefix)
    except VaultError as e:
        logger.error("Failed to revoke leases with prefix '%s': %s", prefix, e)


def lookup_lease(
    client: hvac.Client,
    lease_id: str,
) -> Dict[str, Any]:
    """Lookup lease metadata.

    Args:
        client: hvac Client.
        lease_id: Lease ID.

    Returns:
        Dict with: expire_time, id, issue_time, renewable, ttl.
    """
    try:
        response = client.sys.lookup_lease(lease_id=lease_id)
        return response.get('data', {})
    except VaultError as e:
        raise RuntimeError(f"Failed to lookup lease '{lease_id}': {e}") from e


class PeriodicLeaseRenewer:
    """Background lease renewer for long-running applications.

    Handles automatic lease renewal before expiry.
    Run in a background thread.

    Usage:
        renewer = PeriodicLeaseRenewer(client, lease_id, lease_duration, grace=30)
        renewer.start()  # starts background renewal loop
        ...
        renewer.stop()   # stops and revokes
    """

    def __init__(
        self,
        client: hvac.Client,
        lease_id: str,
        lease_duration: int,
        grace_seconds: int = 60,
        on_renewed: Optional[Callable] = None,
        on_expire_warning: Optional[Callable] = None,
        on_failed: Optional[Callable] = None,
    ):
        self.client = client
        self.lease_id = lease_id
        self.lease_duration = lease_duration
        self.grace_seconds = grace_seconds
        self.on_renewed = on_renewed
        self.on_expire_warning = on_expire_warning
        self.on_failed = on_failed
        self._running = False
        self._expire_warning_fired = False

    def start(self) -> None:
        """Start the renewal loop (blocking — run in thread)."""
        self._running = True

        while self._running:
            # Calculate sleep time (wake before grace period)
            sleep_time = max(1, self.lease_duration - self.grace_seconds)

            logger.debug(
                "Lease renewer sleeping %ds before renewal",
                sleep_time,
            )

            time.sleep(sleep_time)

            if not self._running:
                break

            # Try to renew
            try:
                info = renew_lease(self.client, self.lease_id)
                self.lease_duration = info['lease_duration']

                if self.on_renewed:
                    self.on_renewed(info)

            except Exception as e:
                logger.error("Lease renewal failed: %s", e)

                # Check if near expiry
                try:
                    lookup = lookup_lease(self.client, self.lease_id)
                    ttl = lookup.get('ttl', 0)
                    if ttl <= self.grace_seconds * 2:
                        if not self._expire_warning_fired and self.on_expire_warning:
                            self._expire_warning_fired = True
                            self.on_expire_warning(ttl)
                except Exception:
                    pass

                if self.on_failed:
                    self.on_failed(e)

    def stop(self, revoke: bool = True) -> None:
        """Stop the renewal loop, optionally revoke lease."""
        self._running = False
        if revoke:
            revoke_lease(self.client, self.lease_id)


# ===================================================================
# PKI Engine (Certificates)
# ===================================================================


def pki_generate_certificate(
    client: hvac.Client,
    role_name: str,
    common_name: str,
    alt_names: Optional[List[str]] = None,
    ip_sans: Optional[List[str]] = None,
    uri_sans: Optional[List[str]] = None,
    format_type: str = 'pem',
    ttl: Optional[str] = None,
    exclude_cn_from_sans: bool = False,
    mount_point: str = 'pki',
) -> Dict[str, Any]:
    """Generate an X.509 certificate using PKI engine.

    Args:
        client: hvac Client.
        role_name: PKI role name (configured with allowed CNs, TTLs, etc.).
        common_name: Certificate CN.
        alt_names: Subject Alternative Names (DNS names).
        ip_sans: IP address SANs.
        uri_sans: URI SANs.
        format_type: 'pem', 'der', 'pem_bundle'.
        ttl: Certificate TTL (e.g., '24h', '8760h').
        exclude_cn_from_sans: Don't add CN to SANs.
        mount_point: PKI engine mount path.

    Returns:
        Dict with: certificate, issuing_ca, ca_chain, serial_number, private_key,
                 private_key_type, expiration.
    """
    try:
        response = client.secrets.pki.generate_certificate(
            name=role_name,
            common_name=common_name,
            alt_names=','.join(alt_names) if alt_names else None,
            ip_sans=','.join(ip_sans) if ip_sans else None,
            uri_sans=','.join(uri_sans) if uri_sans else None,
            format=format_type,
            ttl=ttl,
            exclude_cn_from_sans=exclude_cn_from_sans,
            mount_point=mount_point,
        )

        cert_data = response.get('data', {})

        logger.info(
            "Generated certificate from PKI: role=%s, cn=%s, serial=%s, exp=%s",
            role_name,
            common_name,
            cert_data.get('serial_number'),
            cert_data.get('expiration'),
        )

        return {
            'certificate': cert_data.get('certificate'),
            'issuing_ca': cert_data.get('issuing_ca'),
            'ca_chain': cert_data.get('ca_chain'),
            'serial_number': cert_data.get('serial_number'),
            'private_key': cert_data.get('private_key'),
            'private_key_type': cert_data.get('private_key_type'),
            'expiration': cert_data.get('expiration'),
        }

    except VaultError as e:
        raise RuntimeError(
            f"Failed to generate certificate from PKI role '{role_name}': {e}"
        ) from e


def pki_sign_intermediate(
    client: hvac.Client,
    csr: str,
    common_name: str,
    format_type: str = 'pem_bundle',
    ttl: Optional[str] = None,
    mount_point: str = 'pki',
) -> Dict[str, Any]:
    """Sign an intermediate CSR (for chain of CAs).

    Used in PKI hierarchy: Root CA → Intermediate CA → Leaf certs.

    Args:
        client: hvac Client.
        csr: PEM-encoded CSR.
        common_name: Certificate CN.
        format_type: Output format.
        ttl: TTL for intermediate.
        mount_point: PKI engine mount path.

    Returns:
        Dict with certificate info.
    """
    try:
        response = client.secrets.pki.sign_intermediate(
            csr=csr,
            common_name=common_name,
            format=format_type,
            ttl=ttl,
            mount_point=mount_point,
        )

        cert_data = response.get('data', {})
        logger.info(
            "Signed intermediate CSR: cn=%s, serial=%s",
            common_name,
            cert_data.get('serial_number'),
        )
        return {
            'certificate': cert_data.get('certificate'),
            'serial_number': cert_data.get('serial_number'),
            'expiration': cert_data.get('expiration'),
        }

    except VaultError as e:
        raise RuntimeError(f"Failed to sign intermediate CSR: {e}") from e


def pki_get_crl(
    client: hvac.Client,
    mount_point: str = 'pki',
) -> str:
    """Get the Certificate Revocation List (CRL).

    Args:
        client: hvac Client.
        mount_point: PKI engine mount path.

    Returns:
        PEM-encoded CRL.
    """
    try:
        response = client.secrets.pki.read_crl(mount_point=mount_point)
        return response.get('data', {}).get('crl', '')
    except VaultError as e:
        raise RuntimeError(f"Failed to read CRL: {e}") from e


def pki_revoke_certificate(
    client: hvac.Client,
    serial_number: str,
    mount_point: str = 'pki',
) -> None:
    """Revoke a certificate by its serial number.

    Args:
        client: hvac Client.
        serial_number: Certificate serial number (colon-separated hex).
        mount_point: PKI engine mount path.
    """
    try:
        client.secrets.pki.revoke_certificate(
            serial_number=serial_number,
            mount_point=mount_point,
        )
        logger.warning("Revoked PKI certificate: serial=%s", serial_number)
    except VaultError as e:
        raise RuntimeError(f"Failed to revoke certificate: {e}") from e


def pki_rotate_crl(
    client: hvac.Client,
    mount_point: str = 'pki',
) -> None:
    """Force rotate/rebuild the CRL.

    Call after revoking certificates to ensure CRL is updated.

    Args:
        client: hvac Client.
        mount_point: PKI engine mount path.
    """
    try:
        client.secrets.pki.rotate_crl(mount_point=mount_point)
        logger.info("Rotated PKI CRL")
    except VaultError as e:
        raise RuntimeError(f"Failed to rotate CRL: {e}") from e
```

---

## Constraints

### MUST DO

- Read `VAULT_ADDR` from environment, validate it starts with http:// or https://
- Use environment-based auth or appropriate auth method (AppRole, Kubernetes, LDAP)
- Verify connection and authentication with `is_authenticated()` or `lookup_self()`
- KV v2: Access nested `response['data']['data']['key']` (NOT `response['data']['key']`)
- Transit: Base64-encode plaintext before `encrypt_data()` call
- Dynamic secrets: Track `lease_id`, `lease_duration`, `renewable` from response
- Renew leases BEFORE expiry (use grace period buffer)
- Revoke leases when done using try/finally pattern
- Never log, print, or persist token values or secrets
- Use minimum-required policies (least privilege principle)
- Set shortest practical TTL on tokens and dynamic secrets
- Use AppRole for machine/service identity (not root tokens)
- Response wrapping: Deliver `secret_id` and sensitive values via wrapped tokens

### MUST NOT DO

- NEVER hardcode `VAULT_ADDR`, `VAULT_TOKEN`, or any credentials in source code
- NEVER commit `.vault-token` or similar files to version control
- NEVER use root tokens for applications (create dedicated policies)
- NEVER ignore lease handling — unrevoked credentials may linger
- NEVER treat KV v1 and v2 responses the same (different nesting)
- NEVER forget that returned ciphertexts include key version in vault:vN:... format
- NEVER use long-lived static tokens in production (use AppRole + periodic tokens)
- NEVER skip base64 encoding for Transit engine plaintext/ciphertext
- NEVER use Transit with `derived=True` without providing `context` parameter
- NEVER pass sensitive data directly in logs, error messages, or debug output
- NEVER keep plaintext data keys in memory longer than needed (zeroize after use)
- NEVER assume unlimited renewal — most leases stop renewing after `max_ttl`
- NEVER disable or skip TLS verification in production (`verify=False` only for dev)

---

## Output Template

When implementing HashiCorp Vault integrations, produce:

1. **Client Initialization** — `create_vault_client()` from env, `authenticate_approle()`, `authenticate_kubernetes()`
2. **Identity Verification** — `verify_client_authenticated()` checking health + token lookup
3. **KV v2 Operations** — `kv2_get_secret()`, `kv2_create_or_update_secret()` with proper nested `data.data` access
4. **Transit Encryption** — `transit_encrypt()` with base64, `transit_decrypt()`, `transit_rotate_key()`, `transit_rewrap()`
5. **Lease Management** — `renew_lease()`, `revoke_lease()`, `PeriodicLeaseRenewer` class
6. **Dynamic Secrets** — Pattern showing lease_id tracking, try/finally revocation
7. **Response Wrapping** — `wrap_secret_with_ttl()` + `unwrap_token()` secure one-time delivery
8. **PKI Certificate Ops** — `pki_generate_certificate()`, `pki_revoke_certificate()`, CRL handling
9. **Token Cleanup** — `revoke_self_token()` in finally/atexit
10. **Error Handling** — Catching `VaultError`, `Unauthorized`, `Forbidden`, `PathNotFound`

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-aws-iam` | AWS IAM for AWS-native identities and roles |
| `coding-onepassword-api` | 1Password for human-centric password/secret management |
| `coding-entra-id-api` | Microsoft Entra ID for Azure AD identities |
| `coding-okta-api` | Okta for workforce identity and access management |
| `coding-auth0-api` | Auth0 for customer CIAM scenarios |

---

## Live References

| Resource | URL |
|----------|-----|
| HVAC Python SDK (PyPI) | https://pypi.org/project/hvac/ |
| HVAC GitHub | https://github.com/hvac/hvac |
| HVAC Documentation | https://hvac.readthedocs.io/ |
| HashiCorp Vault Documentation | https://developer.hashicorp.com/vault/docs |
| KV Secrets Engine v2 | https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2 |
| Transit Secrets Engine | https://developer.hashicorp.com/vault/docs/secrets/transit |
| PKI Secrets Engine | https://developer.hashicorp.com/vault/docs/secrets/pki |
| AppRole Auth Method | https://developer.hashicorp.com/vault/docs/auth/approle |
| Response Wrapping | https://developer.hashicorp.com/vault/docs/concepts/response-wrapping |
| Lease, Renew, and Revoke | https://developer.hashicorp.com/vault/docs/concepts/lease |
| Vault Policies | https://developer.hashicorp.com/vault/docs/concepts/policies |

---

## Quick API Reference (hvac Client)

| Category | Operations |
|----------|------------|
| **KV v2** | `client.secrets.kv.v2.read_secret_version()`, `create_or_update_secret()`, `delete_latest_version_of_secret()`, `destroy_secret_versions()`, `list_secrets()`, `read_secret_metadata()` |
| **KV v1** | `client.secrets.kv.v1.read_secret()`, `create_or_update_secret()`, `delete_secret()`, `list_secrets()` |
| **Transit** | `client.secrets.transit.create_key()`, `encrypt_data()`, `decrypt_data()`, `rotate_key()`, `rewrap_data()`, `generate_data_key()`, `sign_data()`, `verify_signed_data()` |
| **PKI** | `client.secrets.pki.generate_certificate()`, `sign_intermediate()`, `read_crl()`, `revoke_certificate()`, `rotate_crl()`, `list_roles()` |
| **AppRole** | `client.auth.approle.login()`, `create_role()`, `read_role()`, `generate_secret_id()`, `wrap_secret_id()` |
| **Token** | `client.auth.token.create()`, `lookup_self()`, `renew_self()`, `revoke_self()`, `lookup()`, `renew()`, `revoke()` |
| **Sys (Leases)** | `client.sys.renew_secret()`, `revoke_secret()`, `revoke_secret_prefix()`, `lookup_lease()`, `list_leases()`, `unwrap()`, `wrap_token_lookup()` |
| **Health** | `client.sys.read_health_status()`, `is_authenticated()` |
| **Auth Methods** | `client.auth.ldap.login()`, `kubernetes.login()`, `userpass.login()`, `github.login()`, `okta.login()` |

---

## Secret Response Structure Comparison

| Engine | Path to secret values | Example |
|--------|----------------------|---------|
| **KV v2** | `response['data']['data']['KEY']` | `secret = resp['data']['data']['DB_PASSWORD']` |
| **KV v1** | `response['data']['KEY']` | `secret = resp['data']['DB_PASSWORD']` |
| **Dynamic (DB, AWS, etc.)** | `response['data']['KEY']` | `user = resp['data']['username']`, `lease_id = resp['lease_id']` |
| **Auth (after login)** | `response['auth']['client_token']` | `token = resp['auth']['client_token']` |

**Critical:** KV v2 has an extra level of nesting! This is the #1 cause of bugs.
