---




name: onepassword-api
description: Implements 1Password Connect/SCIM API integration (Vaults, Items, Fields,
  Provisioning, Service Accounts) using onepasswordconnectsdk Python SDK with Connect
  server authentication, item CRUD, SCIM user/group provisioning, and secret reference
  patterns.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: 1password, onepassword connect, op cli, 1password vaults, 1password items,
    secret references, how do i use 1password api, scim provisioning
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
  related-skills: coding-vault-api, coding-aws-iam, coding-entra-id-api




---




# 1Password Connect & CLI API Integration

Implements production-grade 1Password Connect API and 1Password CLI integration using the `onepasswordconnectsdk` Python SDK and `op` CLI patterns. When loaded, this skill makes the model implement Connect server authentication (`OP_CONNECT_HOST`, `OP_CONNECT_TOKEN`), vault operations (list, get), item operations (create, read, update, delete, get by title, CRUD on fields), SCIM (System for Cross-domain Identity Management) user/group provisioning via 1Password Service Accounts, and secret reference syntax (`op://vault/item/field`). All implementations follow 1Password best practices: use Connect server or Service Account tokens (not personal credentials), treat secret references as opaque strings, use field-level access when reading items, enable item versioning and recovery, and use the `op` CLI for scenarios where Connect server isn't available.

## TL;DR Checklist

- [ ] Use `onepasswordconnectsdk.client.new_client(host, token)` for Connect server
- [ ] Read `OP_CONNECT_HOST` and `OP_CONNECT_TOKEN` from environment
- [ ] Vault operations: `client.vaults.list()`, `client.vaults.get(vault_uuid)`
- [ ] Item operations: `client.items.get(vault_uuid, item_uuid)`, `create(vault_uuid, item)`, `update()`, `delete()`
- [ ] Get item by title: `client.items.get_by_title(vault_uuid, title)`
- [ ] Fields: Access via `item.fields`, or helper `get_item_field_value(client, vault_uuid, item_uuid, field_label)`
- [ ] Secret reference syntax: `op://<vault>/<item>/<field>` (resolved at runtime by SDK/CLI)
- [ ] SCIM provisioning: Use 1Password SCIM bridge with Azure AD/Okta/GSuite
- [ ] Service Accounts: Preferred over Connect for new 1Password Business/Enterprise
- [ ] Never log or print item values or secret references
- [ ] Prefer `op` CLI for local development, Connect server for production apps

---

## When to Use

Use this skill when:

- Storing and retrieving application secrets, API keys, database credentials
- Building applications that need programmatic access to 1Password vaults
- Implementing secret rotation without application code changes
- SCIM-based user provisioning to 1Password from identity providers
- Automating vault item management (create, update, rotate)
- Using 1Password as a source of truth for infrastructure secrets
- Deploying 1Password Connect server in Kubernetes/VPC infrastructure
- Building internal tools that need access to shared team vaults
- Integrating 1Password Service Accounts for machine access
- Using `op://` secret references in config files and environment variables

---

## When NOT to Use

- For HashiCorp Vault (more feature-rich for infrastructure/transit/PKI) — use `coding-vault-api`
- For AWS IAM roles and policies — use `coding-aws-iam`
- For cloud identity management (Entra ID, Okta, Auth0)
- For high-throughput encryption operations (Transit engine in Vault is better)
- For dynamic secrets (database credentials, AWS STS) — use `coding-vault-api`
- When you need PKI/certificate management — use `coding-vault-api`
- As a primary database (1Password is for secrets, not general data)
- For caching/queueing (use Redis, RabbitMQ)

---

## Core Workflow

1. **Choose Integration Method** — Select based on use case:
   - Connect Server (self-hosted, good for K8s/VPC apps)
   - Service Account token (1Password cloud, good for serverless/simple apps)
   - 1Password CLI (`op`) for local dev, scripts, CI/CD
   **Checkpoint:** Verify connectivity by listing vaults.

2. **Connect Client Initialization** — Use `onepasswordconnectsdk.client.new_client(OP_CONNECT_HOST, OP_CONNECT_TOKEN)` for Connect server. Both env vars required. **Checkpoint:** Client doesn't validate on creation — validate with `list_vaults()` call.

3. **Vault Operations** — List vaults with `client.vaults.list()`. Get specific vault with `client.vaults.get(vault_uuid)`. Vaults have: `id` (UUID), `name`, `description`, `attribute_version`, `content_version`. **Checkpoint:** App/Service Account needs vault access granted via 1Password.com.

4. **Item Operations** — Most common operations:
   - List items in vault: `client.items.list(vault_uuid)`
   - Get by UUID: `client.items.get(vault_uuid, item_uuid)`
   - Get by title: `client.items.get_by_title(vault_uuid, title)`
   - Create: `client.items.create(vault_uuid, item_obj)`
   - Update: `client.items.update(vault_uuid, item_obj)`
   - Delete: `client.items.delete(vault_uuid, item_uuid)`
   **Checkpoint:** Item fields contain the actual secrets; access carefully.

5. **Field Access** — Items have: `id`, `title`, `vault`, `category`, `urls`, `favorite`, `tags`, `fields`. Fields have: `id`, `section`, `type` (STRING, CONCEALED, EMAIL, etc.), `label`, `value`. Use field `label` or `id` to find values. **Checkpoint:** CONCEALED type fields contain sensitive values — never log.

6. **Secret Reference Syntax** — `op://vault-name/item-name/field-name` or `op://vault-uuid/item-uuid/field-label`. At runtime, the Connect SDK or `op` CLI resolves these to actual values. Good practice: store references in config, resolve at app startup. **Checkpoint:** References require Connect server or CLI to resolve.

7. **Error Handling** — Connect SDK raises exceptions: `ConnectError`, `ItemNotFoundError`, `VaultNotFoundError`, `AuthenticationError`, `AuthorizationError`. Catch these and provide context. **Checkpoint:** AuthenticationError = bad token; AuthorizationError = token lacks permission.

---

## Implementation Patterns

### Pattern 1: Connect SDK Initialization (BAD vs GOOD)

```python
"""1Password Connect SDK initialization and authentication patterns.

There are three primary integration methods:

1. Connect Server (Self-Hosted)
   - Deploy 1Password Connect in your infrastructure
   - Apps connect to Connect via HTTP
   - Connect authenticates to 1Password.com using token
   - Good for: Kubernetes, VPC, private infrastructure

2. Service Account Token (1Password Cloud)
   - Direct API access to 1Password.com
   - Newer approach, no Connect server to maintain
   - Good for: serverless functions, simple apps, CI/CD

3. 1Password CLI (`op` command)
   - For local development, scripts, automation
   - Requires 1Password app or Service Account token
   - Good for: development, scripts, ops workflows

Version: onepasswordconnectsdk >= 1.3.0
Python >= 3.8
"""

from __future__ import annotations

import os
import json
import logging
import subprocess
import shutil
from typing import Any, Dict, List, Optional, Tuple
from enum import Enum

import onepasswordconnectsdk
from onepasswordconnectsdk.client import (
    Client,
    new_client_from_environment,
    new_client,
)
from onepasswordconnectsdk import models
from onepasswordconnectsdk.errors import (
    ConnectError,
    ItemNotFoundError,
    VaultNotFoundError,
    AuthenticationError,
    AuthorizationError,
)

logger = logging.getLogger(__name__)

# ===================================================================
# ❌ BAD — hardcoded tokens/hosts, no validation, no error handling
# ===================================================================

"""
❌ BAD Example (DON'T DO THIS):

import onepasswordconnectsdk
from onepasswordconnectsdk.client import new_client

# ❌ HARDCODED — never commit these values!
OP_CONNECT_HOST = "http://localhost:8080"
OP_CONNECT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  # ❌ SECRET!

client = new_client(OP_CONNECT_HOST, OP_CONNECT_TOKEN)

# ❌ No validation that client actually works
# ❌ No error handling
vaults = client.vaults.list()
for vault in vaults:
    print(f"Vault: {vault.name} - ID: {vault.id}")

# ❌ Fetching item and printing ALL fields (may log secrets)
item = client.items.get_by_title("my-vault", "Database Credentials")
for field in item.fields:
    print(f"Field: {field.label} = {field.value}")  # ❌ EXPOSES SECRETS!
"""

# ===================================================================
# ✅ GOOD — env-based, validation, proper error handling
# ===================================================================


class OnePasswordAuthMethod(Enum):
    CONNECT_SERVER = "connect_server"
    SERVICE_ACCOUNT = "service_account"
    CLI = "cli"


def get_connect_client_from_env() -> Client:
    """Create Connect client from environment variables.

    Required env vars:
        OP_CONNECT_HOST - URL of Connect server (e.g., http://connect:8080)
        OP_CONNECT_TOKEN - Connect server authentication token

    Returns:
        Configured Connect client (not yet validated).

    Raises:
        ValueError: If required env vars missing.
    """
    host = os.environ.get("OP_CONNECT_HOST")
    token = os.environ.get("OP_CONNECT_TOKEN")

    if not host:
        raise ValueError("OP_CONNECT_HOST environment variable is required")
    if not token:
        raise ValueError("OP_CONNECT_TOKEN environment variable is required")

    # Strip trailing slash from host if present
    host = host.rstrip("/")

    client = new_client(host, token)

    logger.info("Created 1Password Connect client for host: %s", host)

    return client


def validate_connect_client(client: Client) -> bool:
    """Validate that Connect client can actually communicate with server.

    Performs a simple list_vaults() call to verify:
    - Connect server is reachable
    - Token is valid (AuthenticationError if invalid)
    - Token has at least one vault access (AuthorizationError if none)

    Args:
        client: Connect client instance.

    Returns:
        True if validation successful.

    Raises:
        AuthenticationError: Token is invalid.
        AuthorizationError: Token has no permissions.
        ConnectError: Network/Connect server issue.
    """
    try:
        vaults = client.vaults.list()
        logger.info(
            "Connect client validated successfully. Access to %d vault(s).",
            len(vaults),
        )
        return True
    except AuthenticationError as e:
        logger.error("Connect authentication failed: invalid token")
        raise
    except AuthorizationError as e:
        logger.error("Connect authorization failed: token has no vault access")
        raise
    except VaultNotFoundError as e:
        # Shouldn't happen for list_vaults
        logger.error("Vault not found during validation")
        raise
    except ConnectError as e:
        logger.error("Connect server error during validation: %s", e)
        raise


def create_validated_connect_client() -> Client:
    """Create AND validate a Connect client from environment.

    Factory method combining creation and validation.

    Returns:
        Validated Connect client.
    """
    client = get_connect_client_from_env()
    validate_connect_client(client)
    return client


# ===================================================================
# CLI-based access (op command)
# ===================================================================


def is_op_cli_available() -> bool:
    """Check if 1Password CLI (`op`) is available.

    Returns:
        True if `op` is in PATH.
    """
    return shutil.which("op") is not None


def op_cli_get_secret(
    vault: str,
    item: str,
    field: str,
) -> str:
    """Get a secret using 1Password CLI.

    Uses `op read` command with secret reference syntax.

    Args:
        vault: Vault name or UUID.
        item: Item name or UUID.
        field: Field label or reference.

    Returns:
        Secret value.

    Raises:
        RuntimeError: If CLI not available or command fails.
        ValueError: If arguments invalid.
    """
    if not is_op_cli_available():
        raise RuntimeError("1Password CLI ('op') is not installed or not in PATH")

    if not vault or not item or not field:
        raise ValueError("vault, item, and field are all required")

    # Build secret reference
    reference = f"op://{vault}/{item}/{field}"

    try:
        # Use `op read` to resolve the secret reference
        result = subprocess.run(
            ["op", "read", reference],
            capture_output=True,
            text=True,
            check=False,
        )

        if result.returncode != 0:
            stderr = result.stderr.strip()
            logger.error("op read failed: %s", stderr)
            raise RuntimeError(f"Failed to get secret from CLI: {stderr}")

        secret = result.stdout.strip()
        logger.debug("Successfully resolved secret via CLI: %s", reference)

        return secret

    except subprocess.SubprocessError as e:
        logger.error("Subprocess error calling op: %s", e)
        raise RuntimeError(f"CLI execution failed: {e}") from e


def op_cli_list_vaults() -> List[Dict[str, Any]]:
    """List vaults using 1Password CLI.

    Returns:
        List of vault dicts with id, name, etc.
    """
    if not is_op_cli_available():
        raise RuntimeError("1Password CLI ('op') is not installed or not in PATH")

    try:
        result = subprocess.run(
            ["op", "vault", "list", "--format=json"],
            capture_output=True,
            text=True,
            check=False,
        )

        if result.returncode != 0:
            raise RuntimeError(f"op vault list failed: {result.stderr}")

        return json.loads(result.stdout)

    except Exception as e:
        logger.error("Failed to list vaults via CLI: %s", e)
        raise
```

### Pattern 2: Vault and Item Operations

```python
"""Vault and Item CRUD operations with 1Password Connect SDK.

Core Concepts:
- Vault: Container for items (like a folder)
  - Has id (UUID), name, description
  - Access granted to apps/users via 1Password.com

- Item: An entry in a vault (Login, Database, Server, API Key, etc.)
  - Has id (UUID), title, category, vault, fields
  - Fields contain the actual data (secrets)

- Category: Item type determines template
  - LOGIN: username, password, URLs
  - DATABASE: username, password, database, server, port
  - API_KEY: credential, notes
  - PASSWORD: password only
  - SERVER: username, password, server, URL
  - SSH_KEY: public key, private key
  - WIRELESS_ROUTER: network, password
  - CREDIT_CARD: cardholder, number, cvv, expiry
  - DOCUMENT: file attachments
  - SECURE_NOTE: plain text (encrypted at rest)

- Field: Name-value pair within an item
  - Has: id, type, label, value, section
  - Types:
    - STRING: Regular text (username, database name)
    - CONCEALED: Sensitive value (password, API key, secret)
    - EMAIL: Email address
    - URL: Web address
    - TOTP: One-time password (secret + generation)
    - MONTH_YEAR: Expiry date
    - DATE: Date
    - PHONE: Phone number
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from onepasswordconnectsdk.client import Client
from onepasswordconnectsdk import models
from onepasswordconnectsdk.errors import (
    ItemNotFoundError,
    VaultNotFoundError,
    ConnectError,
)

logger = logging.getLogger(__name__)


# ===================================================================
# Vault Operations
# ===================================================================


def list_vaults(client: Client) -> List[Dict[str, Any]]:
    """List all vaults accessible to the Connect token.

    Args:
        client: Connect client.

    Returns:
        List of vault dicts with id, name, description, etc.
    """
    try:
        vaults = client.vaults.list()

        result = []
        for vault in vaults:
            result.append({
                'id': vault.id,
                'name': vault.name,
                'description': vault.description,
            })

        logger.debug("Listed %d vault(s)", len(result))
        return result

    except ConnectError as e:
        logger.error("Failed to list vaults: %s", e)
        raise


def get_vault_by_name(
    client: Client,
    vault_name: str,
) -> Optional[Dict[str, Any]]:
    """Find a vault by its name.

    Args:
        client: Connect client.
        vault_name: Vault name to search for.

    Returns:
        Vault dict if found, None otherwise.
    """
    vaults = list_vaults(client)

    name_lower = vault_name.lower()
    for vault in vaults:
        if vault['name'].lower() == name_lower:
            logger.debug("Found vault '%s' with id: %s", vault_name, vault['id'])
            return vault

    logger.warning("Vault not found: %s", vault_name)
    return None


def get_vault_by_id(
    client: Client,
    vault_id: str,
) -> Optional[Dict[str, Any]]:
    """Get vault details by UUID.

    Args:
        client: Connect client.
        vault_id: Vault UUID.

    Returns:
        Vault dict if found, None otherwise.
    """
    try:
        vault = client.vaults.get(vault_id)
        return {
            'id': vault.id,
            'name': vault.name,
            'description': vault.description,
        }
    except VaultNotFoundError:
        logger.warning("Vault not found by id: %s", vault_id)
        return None
    except ConnectError as e:
        logger.error("Failed to get vault: %s", e)
        raise


# ===================================================================
# Item Operations
# ===================================================================


def list_items_in_vault(
    client: Client,
    vault_id: str,
) -> List[Dict[str, Any]]:
    """List all items in a vault (does NOT include field values).

    Important: This only returns item summaries (title, id, category).
    Use get_item() to get the full item including field values.

    Args:
        client: Connect client.
        vault_id: Vault UUID.

    Returns:
        List of item summary dicts.
    """
    try:
        items = client.items.list(vault_id)

        result = []
        for item in items:
            result.append({
                'id': item.id,
                'title': item.title,
                'category': item.category,
                'favorite': item.favorite,
                'tags': item.tags,
            })

        logger.debug("Listed %d item(s) in vault %s", len(result), vault_id)
        return result

    except VaultNotFoundError:
        raise ValueError(f"Vault not found: {vault_id}")
    except ConnectError as e:
        logger.error("Failed to list items in vault %s: %s", vault_id, e)
        raise


def get_item(
    client: Client,
    vault_id: str,
    item_id: str,
) -> Optional[Dict[str, Any]]:
    """Get a full item including all field values.

    Args:
        client: Connect client.
        vault_id: Vault UUID.
        item_id: Item UUID.

    Returns:
        Item dict with fields and values, None if not found.
    """
    try:
        item = client.items.get(vault_id, item_id)

        # Convert SDK item object to dict
        result = {
            'id': item.id,
            'title': item.title,
            'vault_id': item.vault.id,
            'category': item.category,
            'favorite': item.favorite,
            'tags': item.tags,
            'urls': item.urls,
            'fields': [],
        }

        if item.fields:
            for field in item.fields:
                field_dict = {
                    'id': field.id,
                    'label': field.label,
                    'type': field.type,
                    'value': field.value,  # BE CAREFUL with this!
                    'section': field.section.id if field.section else None,
                }
                result['fields'].append(field_dict)

        logger.debug("Retrieved item '%s' (%s) from vault %s",
                     result['title'], item_id, vault_id)

        return result

    except ItemNotFoundError:
        logger.warning("Item not found: vault=%s, item=%s", vault_id, item_id)
        return None
    except VaultNotFoundError:
        raise ValueError(f"Vault not found: {vault_id}")
    except ConnectError as e:
        logger.error("Failed to get item: %s", e)
        raise


def get_item_by_title(
    client: Client,
    vault_id: str,
    title: str,
) -> Optional[Dict[str, Any]]:
    """Get an item by its title (convenience method).

    First searches for items matching title, then fetches full item.

    Args:
        client: Connect client.
        vault_id: Vault UUID.
        title: Item title to find (case-insensitive).

    Returns:
        Full item dict if found, None otherwise.
    """
    try:
        # SDK provides get_by_title convenience method
        item = client.items.get_by_title(vault_id, title)

        # Convert to dict format
        result = {
            'id': item.id,
            'title': item.title,
            'vault_id': item.vault.id,
            'category': item.category,
            'favorite': item.favorite,
            'tags': item.tags,
            'urls': item.urls,
            'fields': [],
        }

        if item.fields:
            for field in item.fields:
                result['fields'].append({
                    'id': field.id,
                    'label': field.label,
                    'type': field.type,
                    'value': field.value,
                    'section': field.section.id if field.section else None,
                })

        logger.debug("Found item by title '%s' in vault %s", title, vault_id)
        return result

    except ItemNotFoundError:
        logger.warning("Item not found by title '%s' in vault %s", title, vault_id)
        return None
    except ConnectError as e:
        logger.error("Failed to get item by title: %s", e)
        raise


def get_item_field_value(
    client: Client,
    vault_id: str,
    item_id: str,
    field_label: str,
) -> Optional[str]:
    """Get a specific field value from an item.

    More convenient than getting full item and iterating fields.

    Args:
        client: Connect client.
        vault_id: Vault UUID.
        item_id: Item UUID.
        field_label: Field label (display name like "username", "password").

    Returns:
        Field value string if found, None otherwise.
    """
    item = get_item(client, vault_id, item_id)
    if not item:
        return None

    label_lower = field_label.lower()
    for field in item.get('fields', []):
        if field.get('label', '').lower() == label_lower:
            value = field.get('value')
            logger.debug(
                "Got field '%s' from item '%s'",
                field_label,
                item.get('title'),
            )
            return value

    logger.warning(
        "Field '%s' not found in item '%s' (vault %s)",
        field_label,
        item.get('title'),
        vault_id,
    )
    return None


def get_item_field_value_by_title(
    client: Client,
    vault_id: str,
    item_title: str,
    field_label: str,
) -> Optional[str]:
    """Get field value by vault ID, item title, and field label.

    Convenience method for common pattern:
    "Get the 'password' field from 'Database' item in 'App' vault"

    Args:
        client: Connect client.
        vault_id: Vault UUID.
        item_title: Item title.
        field_label: Field label.

    Returns:
        Field value if found, None otherwise.
    """
    item = get_item_by_title(client, vault_id, item_title)
    if not item:
        return None

    label_lower = field_label.lower()
    for field in item.get('fields', []):
        if field.get('label', '').lower() == label_lower:
            return field.get('value')

    return None


# ===================================================================
# Item Create/Update/Delete
# ===================================================================


def create_login_item(
    client: Client,
    vault_id: str,
    title: str,
    username: str,
    password: str,
    url: Optional[str] = None,
    tags: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Create a new LOGIN category item.

    Args:
        client: Connect client.
        vault_id: Vault UUID.
        title: Item title.
        username: Username value.
        password: Password value (sensitive!).
        url: Optional website URL.
        tags: Optional list of tags.

    Returns:
        Created item dict.
    """
    try:
        # Build fields
        fields = [
            models.Field(
                label='username',
                value=username,
                type=models.FieldType.STRING,
            ),
            models.Field(
                label='password',
                value=password,
                type=models.FieldType.CONCEALED,  # Mark as sensitive
            ),
        ]

        # Optional URL
        urls = []
        if url:
            urls.append(models.Url(url=url, primary=True))

        # Create item model
        item = models.Item(
            title=title,
            category=models.ItemCategory.LOGIN,
            vault=models.Vault(id=vault_id),
            fields=fields,
            urls=urls if urls else None,
            tags=tags,
        )

        # Create via SDK
        created = client.items.create(vault_id, item)

        result = {
            'id': created.id,
            'title': created.title,
            'category': created.category,
            'vault_id': vault_id,
        }

        logger.info(
            "Created LOGIN item '%s' (%s) in vault %s",
            title,
            created.id,
            vault_id,
        )

        return result

    except Exception as e:
        logger.error("Failed to create item '%s': %s", title, e)
        raise


def create_api_key_item(
    client: Client,
    vault_id: str,
    title: str,
    api_key: str,
    notes: Optional[str] = None,
    tags: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Create a new API_KEY category item.

    Args:
        client: Connect client.
        vault_id: Vault UUID.
        title: Item title.
        api_key: API key value (sensitive!).
        notes: Optional notes.
        tags: Optional tags.

    Returns:
        Created item dict.
    """
    try:
        fields = [
            models.Field(
                label='credential',
                value=api_key,
                type=models.FieldType.CONCEALED,
            ),
        ]

        if notes:
            fields.append(models.Field(
                label='notes',
                value=notes,
                type=models.FieldType.STRING,
            ))

        item = models.Item(
            title=title,
            category=models.ItemCategory.API_KEY,
            vault=models.Vault(id=vault_id),
            fields=fields,
            tags=tags,
        )

        created = client.items.create(vault_id, item)

        logger.info("Created API_KEY item '%s' in vault %s", title, vault_id)

        return {
            'id': created.id,
            'title': created.title,
            'vault_id': vault_id,
        }

    except Exception as e:
        logger.error("Failed to create API key item: %s", e)
        raise


def delete_item(
    client: Client,
    vault_id: str,
    item_id: str,
) -> bool:
    """Delete an item (PERMANENT — item versioning may recover).

    Warning: Deletion is immediate. 1Password Business/Enterprise has
    item history that allows recovery within retention period.

    Args:
        client: Connect client.
        vault_id: Vault UUID.
        item_id: Item UUID.

    Returns:
        True if deletion successful.
    """
    try:
        client.items.delete(vault_id, item_id)
        logger.warning("DELETED item %s from vault %s", item_id, vault_id)
        return True
    except ItemNotFoundError:
        logger.warning("Item not found for deletion: %s", item_id)
        return False
    except ConnectError as e:
        logger.error("Failed to delete item %s: %s", item_id, e)
        raise


# ===================================================================
# Secret Reference Pattern
# ===================================================================


class SecretReferenceResolver:
    """Resolver for 1Password secret references.

    Secret reference syntax: op://<vault>/<item>/<field>

    Examples:
        op://App Vault/Database Credentials/password
        op://prod/Stripe API Key/credential
        op://dev/GitHub Token/username

    Usage:
        resolver = SecretReferenceResolver(client)
        db_password = resolver.resolve("op://App/Database/password")
        api_key = resolver.resolve("op://App/API Key/credential")
    """

    REF_PREFIX = "op://"

    def __init__(self, client: Client):
        self.client = client
        self._cache: Dict[str, str] = {}

    @classmethod
    def is_reference(cls, value: str) -> bool:
        """Check if a value looks like a 1Password secret reference.

        Args:
            value: String to check.

        Returns:
            True if starts with "op://".
        """
        return isinstance(value, str) and value.startswith(cls.REF_PREFIX)

    @classmethod
    def parse_reference(cls, reference: str) -> Tuple[str, str, str]:
        """Parse a secret reference into (vault, item, field).

        Args:
            reference: Secret reference like "op://vault/item/field".

        Returns:
            Tuple of (vault_name_or_uuid, item_name_or_uuid, field_label_or_id).

        Raises:
            ValueError: If reference format is invalid.
        """
        if not cls.is_reference(reference):
            raise ValueError(f"Not a valid 1Password reference: {reference}")

        # Remove "op://" prefix
        content = reference[len(cls.REF_PREFIX):]

        # Split into parts
        parts = content.split("/")

        if len(parts) < 3:
            raise ValueError(
                f"Reference must have at least 3 parts: {reference} "
                f"(expected: op://vault/item/field)"
            )

        vault = parts[0]
        item = "/".join(parts[1:-1])  # Item name may contain "/"
        field = parts[-1]

        return vault, item, field

    def resolve(
        self,
        reference: str,
        use_cache: bool = True,
    ) -> str:
        """Resolve a secret reference to its actual value.

        Args:
            reference: Secret reference like "op://vault/item/field".
            use_cache: Whether to use cached value (reduces API calls).

        Returns:
            Resolved secret value.

        Raises:
            ValueError: If reference is invalid or cannot be resolved.
        """
        # Check cache first
        if use_cache and reference in self._cache:
            logger.debug("Resolved reference from cache: %s", reference)
            return self._cache[reference]

        # Parse the reference
        vault_spec, item_spec, field_spec = self.parse_reference(reference)

        # Find vault by name or UUID
        vault = get_vault_by_name(self.client, vault_spec)
        if not vault:
            # Try direct UUID lookup
            vault = get_vault_by_id(self.client, vault_spec)

        if not vault:
            raise ValueError(f"Vault not found: {vault_spec}")

        vault_id = vault['id']

        # Find item by title or UUID
        item = get_item_by_title(self.client, vault_id, item_spec)
        if not item:
            # Try direct UUID lookup
            item = get_item(self.client, vault_id, item_spec)

        if not item:
            raise ValueError(f"Item not found: {item_spec} in vault {vault_id}")

        # Find field value by label
        field_label_lower = field_spec.lower()
        for field in item.get('fields', []):
            if field.get('label', '').lower() == field_label_lower:
                value = field.get('value')
                if value is not None:
                    # Cache for future
                    self._cache[reference] = value
                    logger.debug("Resolved reference: %s", reference)
                    return value

        raise ValueError(
            f"Field '{field_spec}' not found in item '{item_spec}' "
            f"(vault '{vault_spec}')"
        )

    def clear_cache(self) -> None:
        """Clear the reference cache.

        Call after item updates to get fresh values.
        """
        self._cache.clear()
        logger.debug("Cleared secret reference cache")


def resolve_config_secrets(
    client: Client,
    config: Dict[str, Any],
) -> Dict[str, Any]:
    """Recursively resolve all 1Password secret references in a config dict.

    Scans through the config dict, finds all values that look like
    1Password references (op://...), resolves them, and returns
    a new dict with actual secret values.

    Args:
        client: Connect client.
        config: Dict potentially containing secret references.

    Returns:
        New dict with references replaced by actual values.
    """
    resolver = SecretReferenceResolver(client)

    def resolve_value(value: Any) -> Any:
        if isinstance(value, str) and resolver.is_reference(value):
            return resolver.resolve(value)
        elif isinstance(value, dict):
            return {k: resolve_value(v) for k, v in value.items()}
        elif isinstance(value, list):
            return [resolve_value(v) for v in value]
        else:
            return value

    resolved = resolve_value(config)

    logger.info(
        "Resolved secrets in config. Cache contains %d reference(s).",
        len(resolver._cache),
    )

    return resolved
```

---

## Constraints

### MUST DO

- Read `OP_CONNECT_HOST` and `OP_CONNECT_TOKEN` from environment variables
- Validate Connect client connectivity with `list_vaults()` call before use
- Use field `type` to distinguish CONCEALED (sensitive) from STRING fields
- Never log or print CONCEALED field values
- Use secret references (`op://vault/item/field`) in config files
- Resolve references at app startup/configuration load time
- Use Connect server or Service Account tokens for production (not personal credentials)
- Grant minimum vault access to Connect tokens (least privilege)
- Use 1Password item versioning for recovery after accidental deletions
- Tag items for easier discovery and automation
- Use categories appropriately (LOGIN, DATABASE, API_KEY, etc.)

### MUST NOT DO

- NEVER hardcode Connect tokens or 1Password credentials in source code
- NEVER commit `.env` files containing `OP_CONNECT_TOKEN` to git
- NEVER log, print, or persist CONCEALED field values
- NEVER treat secret references as actual secrets (they require resolution)
- NEVER use personal credentials for application access (use Connect/Service Account)
- NEVER expose Connect server directly to the internet (put behind firewall/VPC)
- NEVER use Connect server with HTTP in production (always use HTTPS)
- NEVER grant all vaults access to a Connect token (only what's needed)
- NEVER rely on Connect SDK to automatically retry transient errors
- NEVER delete items without confirming they're no longer in use
- NEVER store non-secret data in 1Password (it's for secrets, not general config)

---

## Output Template

When implementing 1Password integrations, produce:

1. **Client Initialization** — `create_validated_connect_client()` from env vars
2. **Vault Operations** — `list_vaults()`, `get_vault_by_name()`, `get_vault_by_id()`
3. **Item Operations** — `get_item()`, `get_item_by_title()`, `list_items_in_vault()`
4. **Field Access** — `get_item_field_value()`, `get_item_field_value_by_title()`
5. **Create Items** — `create_login_item()`, `create_api_key_item()` builders
6. **Secret Reference Resolver** — `SecretReferenceResolver` class with `op://` parsing
7. **Config Resolution** — `resolve_config_secrets()` recursive dict resolution
8. **CLI Fallback** — `op_cli_get_secret()` for dev/test scenarios
9. **Error Handling** — Catching `AuthenticationError`, `AuthorizationError`, `ItemNotFoundError`, `VaultNotFoundError`, `ConnectError`

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-vault-api` | HashiCorp Vault — more comprehensive secrets, dynamic secrets, transit/PKI |
| `coding-aws-iam` | AWS IAM — AWS-native identities and roles |
| `coding-entra-id-api` | Microsoft Entra ID — Azure AD identities and SCIM |
| `coding-okta-api` | Okta — workforce identity and SCIM provisioning |
| `coding-auth0-api` | Auth0 — customer CIAM |

---

## Live References

| Resource | URL |
|----------|-----|
| 1Password Connect Python SDK (PyPI) | https://pypi.org/project/onepasswordconnectsdk/ |
| Connect SDK GitHub | https://github.com/1Password/connect-sdk-python |
| 1Password Connect Documentation | https://developer.1password.com/docs/connect/ |
| 1Password SDK Documentation | https://developer.1password.com/docs/sdks/ |
| Secret Reference Syntax | https://developer.1password.com/docs/cli/secrets-reference-syntax/ |
| 1Password CLI Documentation | https://developer.1password.com/docs/cli/ |
| 1Password Service Accounts | https://developer.1password.com/docs/service-accounts/ |
| SCIM Provisioning | https://developer.1password.com/docs/provisioning/ |
| Connect Server Deployment Guide | https://developer.1password.com/docs/connect/deploy/ |

---

## Item Category Field Reference

| Category | Common Fields | Typical Use Case |
|----------|----------------|------------------|
| `LOGIN` | username, password, URLs | Website/app login credentials |
| `DATABASE` | username, password, database, server, port | Database connection credentials |
| `API_KEY` | credential, notes | API keys, service account keys |
| `SERVER` | username, password, server, URL, console URL | Server/SSH admin credentials |
| `SSH_KEY` | public key, private key, passphrase | SSH key pairs |
| `CREDIT_CARD` | cardholder, number, cvv, expiry date | Payment card data |
| `DOCUMENT` | file attachments | Secure document storage |
| `SECURE_NOTE` | notes | Encrypted text notes |
| `PASSWORD` | password | Password-only item |
| `WIRELESS_ROUTER` | network name, password, base station | WiFi/network device access |

---

## Field Types

| Type Value | Purpose | Sensitive? |
|------------|---------|------------|
| `STRING` | Regular text (username, notes, labels) | No |
| `CONCEALED` | Passwords, API keys, secrets (displayed as bullets) | Yes |
| `EMAIL` | Email address | No |
| `URL` | Web address/URL | No |
| `TOTP` | Time-based one-time password (secret + generation) | Yes |
| `PHONE` | Phone number | No |
| `DATE` | Date value | No |
| `MONTH_YEAR` | Month/year expiry (credit cards) | No |
| `MENU` | Dropdown/select value | No |

**Important:** Always check `field.type == 'CONCEALED'` before logging or displaying.
