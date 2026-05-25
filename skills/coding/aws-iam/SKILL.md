---
name: aws-iam
description: Implements AWS IAM (Identity and Access Management) integration (Users,
  Roles, Policies, Groups, Access Keys, MFA, STS, Identity Center) using boto3 SDK
  with proper credential chain, policy validation, least privilege principle, and
  temporary credentials.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: aws iam, boto3 iam, aws roles, iam policies, sts assume role, aws access
    keys, aws mfa, how do i manage aws iam
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
  related-skills: coding-entra-id-api, coding-okta-api, coding-vault-api
------
# AWS IAM Integration (Identity & Access Management)

Implements production-grade AWS IAM (Identity and Access Management) integration using the `boto3` Python SDK. When loaded, this skill makes the model implement IAM user lifecycle management (create, access keys, MFA), IAM groups and managed policies, IAM roles and trust policies, STS (Security Token Service) operations (AssumeRole, GetFederationToken, GetSessionToken), policy validation using IAM Access Analyzer, permission boundary enforcement, least privilege principle implementation, and credential chain best practices. All implementations follow AWS security best practices: use default credential provider chain, rotate access keys, enforce MFA for console and API access, use roles instead of long-term credentials, use permission boundaries, validate policies before deployment, and monitor access with CloudTrail.

## TL;DR Checklist

- [ ] Use boto3 with default credential chain (never hardcode credentials)
- [ ] `import boto3` then `iam = boto3.client('iam')` or `sts = boto3.client('sts')`
- [ ] Use resource-level APIs for simpler operations: `iam = boto3.resource('iam')`
- [ ] Always validate policies using `validate_policy()` or Access Analyzer
- [ ] Use `sts.assume_role()` for cross-account access instead of access keys
- [ ] Enforce MFA in trust policies with `aws:MultiFactorAuthPresent` condition
- [ ] Rotate access keys: create 2nd key, migrate apps, disable old, delete
- [ ] Use permission boundaries to delegate admin safely
- [ ] Use roles for EC2, Lambda, ECS (instance profiles, execution roles)
- [ ] Use `sts.get_caller_identity()` to verify which identity is being used
- [ ] Managed policies over inline policies for reusability and versioning
- [ ] Policy versions: keep max 5, delete old versions when creating new
- [ ] Trust policies: limit principals, use external IDs for third-party access

---

## When to Use

Use this skill when:

- Managing IAM users, groups, roles, and policies programmatically
- Implementing cross-account access using IAM roles and STS AssumeRole
- Creating and rotating IAM access keys for service accounts
- Enforcing MFA policies for human and machine identities
- Building permission delegation with permission boundaries
- Validating IAM policies for security before deployment
- Creating EC2 instance profiles, Lambda execution roles, ECS task roles
- Implementing federation (SAML, OIDC, web identity, Active Directory)
- Working with AWS Identity Center (SSO) for workforce access
- Using STS temporary credentials instead of long-term access keys
- Auditing IAM configuration for least privilege compliance
- Creating service-linked roles for AWS services

---

## When NOT to Use

- For Microsoft Entra ID / Azure AD identities — use `coding-entra-id-api`
- For Okta workforce identity — use `coding-okta-api`
- For HashiCorp Vault secrets and identities — use `coding-vault-api`
- When you need a unified identity platform across multiple clouds (Okta/Auth0 better)
- For application-level authz/Zanzibar-style permission systems
- Directly storing user passwords (never put secrets in IAM policies)
- For non-AWS resources (IAM is AWS-specific)

---

## Core Workflow

1. **Initialize boto3 Client/Resource** — Use default credential chain: `boto3.client('iam')` or `boto3.resource('iam')`. Credentials auto-discover from: env vars (`AWS_ACCESS_KEY_ID`), `~/.aws/credentials`, IAM role (EC2/ECS/Lambda), SSO profile. **Checkpoint:** Verify identity with `sts.get_caller_identity()` on startup.

2. **IAM User Operations** — Create users with `create_user()`, list with `list_users()`, add to groups with `add_user_to_group()`, create access keys with `create_access_key()`. **Checkpoint:** Access key secret only visible ONCE at creation — store securely, never log.

3. **Managed Policies** — Create customer managed policies with `create_policy()`, attach to users/groups/roles with `attach_user_policy()`, `attach_group_policy()`, `attach_role_policy()`. Use policy versions for updates: `create_policy_version()`, `set_default_policy_version()`. **Checkpoint:** Validate policy JSON first with `validate_policy()` (IAM API) or Access Analyzer.

4. **IAM Roles & Trust Policies** — Create roles with trust policy defining who can assume them: `create_role(RoleName='...', AssumeRolePolicyDocument=trust_policy_json)`. Attach permissions policies. Use `sts.assume_role()` to get temporary credentials. **Checkpoint:** Trust policies must allow the principal; permissions policies grant what the role can do.

5. **STS Operations** — Get temporary credentials:
   - `assume_role()` — cross-account, role chaining, MFA-protected
   - `get_session_token()` — MFA-required for IAM user calling sensitive APIs
   - `get_federation_token()` — federate users into AWS
   - `assume_role_with_web_identity()` — OIDC providers (Cognito, Auth0)
   **Checkpoint:** Temporary credentials expire (max 12h for assume_role, 36h for get_federation_token).

6. **Access Key Rotation** — Safe rotation workflow:
   1. Create second access key (max 2 per user)
   2. Update applications to use new key
   3. Verify new key works
   4. Disable old key (`update_access_key(Status='Inactive')`)
   5. After grace period, delete old key (`delete_access_key()`)
   **Checkpoint:** Never delete the only key without verifying replacement works.

7. **Policy Validation** — Use two validation methods:
   - `iam.validate_policy(PolicyDocument=..., ValidatePolicyResourceType='...')`
   - Access Analyzer: `accessanalyzer.validate_policy(...)` for comprehensive checks
   **Checkpoint:** Validation catches syntax errors, missing actions, overly broad resources.

---

## Implementation Patterns

### Pattern 1: Boto3 IAM Initialization (BAD vs GOOD)

```python
"""AWS IAM / boto3 initialization and credential handling patterns.

Boto3 credential provider chain (order of precedence):
1. Explicit credentials passed to client/resource (NOT RECOMMENDED)
2. Environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
3. Credentials/config files: ~/.aws/credentials, ~/.aws/config
4. IAM roles for Amazon EC2/ECS/Lambda containers
5. AWS SSO profiles (via aws sso login)
6. AWS credentials process (credential_process in config)

Always prefer default credential chain over explicit credentials.
Never hardcode credentials in source code or commit them to git.

Version: boto3 >= 1.34.0, botocore >= 1.34.0
Python >= 3.8
"""

from __future__ import annotations

import os
import json
import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Sequence

import boto3
import botocore
from botocore.exceptions import ClientError, ParamValidationError

logger = logging.getLogger(__name__)

# ===================================================================
# ❌ BAD — hardcoded credentials, no error handling, no credential chain
# ===================================================================

"""
❌ BAD Example (DON'T DO THIS):

import boto3

# ❌ HARDCODED CREDENTIALS — NEVER COMMIT THESE TO GIT!
ACCESS_KEY = "AKIAIOSFODNN7EXAMPLE"
SECRET_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"

# ❌ Passing credentials explicitly (anti-pattern for production)
iam = boto3.client(
    'iam',
    aws_access_key_id=ACCESS_KEY,
    aws_secret_access_key=SECRET_KEY,
)

# ❌ No error handling
response = iam.list_users()
for user in response['Users']:
    print(user['UserName'])

# ❌ No validation of what identity is being used
# Could be running as wrong role/user in production
"""

# ===================================================================
# ✅ GOOD — default credential chain, verify identity, error handling
# ===================================================================


def get_iam_client(region_name: str | None = None) -> boto3.client:
    """Create IAM boto3 client using default credential chain.

    IAM is a global service (us-east-1), but client can be created in any region.

    Args:
        region_name: Optional AWS region (IAM is global but client needs a region).

    Returns:
        Boto3 IAM client.
    """
    session = boto3.Session(region_name=region_name or 'us-east-1')
    return session.client('iam')


def get_iam_resource(region_name: str | None = None) -> boto3.resources.base.ServiceResource:
    """Create IAM boto3 resource (higher-level API).

    Resources provide object-oriented access:
        iam.User('name').create_policy(...)
        iam.Role('name').attach_policy(PolicyArn='...')

    Returns:
        Boto3 IAM service resource.
    """
    session = boto3.Session(region_name=region_name or 'us-east-1')
    return session.resource('iam')


def get_sts_client(region_name: str | None = None) -> boto3.client:
    """Create STS (Security Token Service) client.

    Used for: AssumeRole, GetSessionToken, GetFederationToken, GetCallerIdentity.

    Returns:
        Boto3 STS client.
    """
    session = boto3.Session(region_name=region_name or 'us-east-1')
    return session.client('sts')


def get_accessanalyzer_client(region_name: str | None = None) -> boto3.client:
    """Create IAM Access Analyzer client.

    Used for policy validation, finding public/overly permissive resources.

    Returns:
        Boto3 Access Analyzer client.
    """
    session = boto3.Session(region_name=region_name or 'us-east-1')
    return session.client('accessanalyzer')


def verify_caller_identity(sts_client: boto3.client | None = None) -> Dict[str, Any]:
    """Verify the current AWS identity being used.

    ALWAYS call this on application startup to confirm you're running
    as the expected identity (user/role). Critical for preventing
    "it worked locally but not in production" issues.

    Args:
        sts_client: Optional pre-created STS client.

    Returns:
        Dict with: UserId, Account, Arn.

    Example:
        {
            'UserId': 'AIDA...',
            'Account': '123456789012',
            'Arn': 'arn:aws:iam::123456789012:user/MyUser'
        }
    """
    if not sts_client:
        sts_client = get_sts_client()

    try:
        response = sts_client.get_caller_identity()

        # Extract important fields
        result = {
            'UserId': response.get('UserId'),
            'Account': response.get('Account'),
            'Arn': response.get('Arn'),
        }

        logger.info(
            "AWS caller identity verified: account=%s arn=%s",
            result['Account'],
            result['Arn'],
        )

        return result

    except ClientError as e:
        logger.error("Failed to verify AWS identity: %s", e)
        raise RuntimeError(f"AWS authentication failed: {e}") from e


def parse_iam_arn(arn: str) -> Dict[str, str]:
    """Parse an IAM ARN into its components.

    IAM ARN format:
        arn:aws:iam::<account-id>:<resource-type>/<resource-path>

    Examples:
        arn:aws:iam::123456789012:user/AdminUser
        arn:aws:iam::123456789012:role/MyApp-Role
        arn:aws:iam::123456789012:policy/MyPolicy
        arn:aws:iam::123456789012:group/Developers
        arn:aws:iam::aws:policy/AdministratorAccess (AWS managed)

    Args:
        arn: IAM ARN string.

    Returns:
        Dict with: partition, service, region, account, resource_type, resource.
    """
    parts = arn.split(':')
    # arn:aws:iam:region:account:resource
    # region is empty for IAM (global service)

    result: Dict[str, str] = {
        'partition': parts[1] if len(parts) > 1 else '',
        'service': parts[2] if len(parts) > 2 else '',
        'region': parts[3] if len(parts) > 3 else '',
        'account': parts[4] if len(parts) > 4 else '',
    }

    # Parse resource part (can contain / like "user/Admin")
    resource = parts[5] if len(parts) > 5 else ''
    result['resource'] = resource

    if '/' in resource:
        resource_type, resource_path = resource.split('/', 1)
        result['resource_type'] = resource_type
        result['resource_path'] = resource_path
    else:
        result['resource_type'] = resource
        result['resource_path'] = ''

    return result


def iam_client_error_message(e: ClientError) -> str:
    """Extract human-readable error from boto3 ClientError.

    Common IAM error codes:
        EntityAlreadyExists — user/role/policy already exists
        NoSuchEntity — user/role/policy not found
        LimitExceeded — max 2 access keys, max 5 policy versions, etc.
        MalformedPolicyDocument — policy JSON syntax error
        InvalidInput — invalid parameter value
        DeleteConflict — can't delete user with access keys/group memberships

    Args:
        e: ClientError exception.

    Returns:
        Formatted error string with code and message.
    """
    error_code = e.response.get('Error', {}).get('Code', 'Unknown')
    error_message = e.response.get('Error', {}).get('Message', str(e))
    request_id = e.response.get('ResponseMetadata', {}).get('RequestId', 'N/A')

    return f"IAM Error [{error_code}]: {error_message} (request-id: {request_id})"
```

### Pattern 2: IAM User Management & Access Key Rotation

```python
"""IAM User management and access key operations.

Best practices:
1. Prefer IAM roles over IAM users for applications
2. Use IAM users ONLY for human identities requiring console/API access
3. Enforce MFA for ALL IAM users (console and sensitive API operations)
4. Rotate access keys regularly (90 days or less is common)
5. Max 2 access keys per user (enables zero-downtime rotation)
6. Delete unused access keys
7. Use password policies with strong requirements
8. Separate duties using different IAM users for different functions
"""

from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)


def create_iam_user(
    iam_client: boto3.client,
    user_name: str,
    tags: List[Dict[str, str]] | None = None,
    permissions_boundary: str | None = None,
    path: str = '/',
) -> Dict[str, Any]:
    """Create a new IAM user.

    Args:
        iam_client: Boto3 IAM client.
        user_name: Name for the new user.
        tags: Optional tags (list of {'Key': '...', 'Value': '...'}).
        permissions_boundary: Optional policy ARN for permission boundary.
        path: Optional path (e.g., '/employees/', '/service-users/').

    Returns:
        Created user dict.

    Raises:
        ValueError: If user already exists.
        RuntimeError: For other IAM errors.
    """
    try:
        kwargs: Dict[str, Any] = {
            'UserName': user_name,
            'Path': path,
        }
        if tags:
            kwargs['Tags'] = tags
        if permissions_boundary:
            kwargs['PermissionsBoundary'] = permissions_boundary

        response = iam_client.create_user(**kwargs)
        user = response['User']

        logger.info(
            "Created IAM user: %s (arn=%s, created=%s)",
            user['UserName'],
            user['Arn'],
            user.get('CreateDate'),
        )
        return user

    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', '')
        if error_code == 'EntityAlreadyExists':
            raise ValueError(f"IAM user '{user_name}' already exists") from e
        raise RuntimeError(iam_client_error_message(e)) from e


def get_iam_user(
    iam_client: boto3.client,
    user_name: str,
) -> Dict[str, Any] | None:
    """Get an IAM user by name.

    Args:
        iam_client: Boto3 IAM client.
        user_name: User name.

    Returns:
        User dict if found, None if not found.
    """
    try:
        response = iam_client.get_user(UserName=user_name)
        return response['User']
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', '')
        if error_code == 'NoSuchEntity':
            return None
        raise RuntimeError(iam_client_error_message(e)) from e


def list_iam_users(
    iam_client: boto3.client,
    path_prefix: str | None = None,
) -> List[Dict[str, Any]]:
    """List all IAM users (with pagination handling).

    Args:
        iam_client: Boto3 IAM client.
        path_prefix: Optional path prefix to filter (e.g., '/service-users/').

    Returns:
        List of user dicts.
    """
    users: List[Dict[str, Any]] = []
    kwargs: Dict[str, Any] = {}
    if path_prefix:
        kwargs['PathPrefix'] = path_prefix

    try:
        paginator = iam_client.get_paginator('list_users')
        for page in paginator.paginate(**kwargs):
            users.extend(page.get('Users', []))

        logger.info("Listed %d IAM users", len(users))
        return users

    except ClientError as e:
        raise RuntimeError(iam_client_error_message(e)) from e


def delete_iam_user(
    iam_client: boto3.client,
    user_name: str,
    force: bool = False,
) -> None:
    """Delete an IAM user (must remove all dependencies first).

    Required before deletion:
    - Delete/detach all policies
    - Delete all access keys
    - Remove from all groups
    - Delete MFA devices
    - Delete login profile (console access)
    - Delete signing certificates

    Args:
        iam_client: Boto3 IAM client.
        user_name: User to delete.
        force: If True, try to remove all dependencies first.
    """
    if force:
        # Remove everything attached to user
        # 1. Access keys
        try:
            keys_resp = iam_client.list_access_keys(UserName=user_name)
            for key in keys_resp.get('AccessKeyMetadata', []):
                iam_client.delete_access_key(
                    UserName=user_name,
                    AccessKeyId=key['AccessKeyId'],
                )
        except ClientError:
            pass

        # 2. Group memberships
        try:
            groups_resp = iam_client.list_groups_for_user(UserName=user_name)
            for group in groups_resp.get('Groups', []):
                iam_client.remove_user_from_group(
                    UserName=user_name,
                    GroupName=group['GroupName'],
                )
        except ClientError:
            pass

        # 3. Policies
        try:
            attached_resp = iam_client.list_attached_user_policies(UserName=user_name)
            for policy in attached_resp.get('AttachedPolicies', []):
                iam_client.detach_user_policy(
                    UserName=user_name,
                    PolicyArn=policy['PolicyArn'],
                )
        except ClientError:
            pass

        # 4. Inline policies
        try:
            inline_resp = iam_client.list_user_policies(UserName=user_name)
            for policy_name in inline_resp.get('PolicyNames', []):
                iam_client.delete_user_policy(
                    UserName=user_name,
                    PolicyName=policy_name,
                )
        except ClientError:
            pass

        # 5. Login profile (console password)
        try:
            iam_client.delete_login_profile(UserName=user_name)
        except ClientError:
            pass

        # 6. MFA devices
        try:
            mfa_resp = iam_client.list_mfa_devices(UserName=user_name)
            for mfa in mfa_resp.get('MFADevices', []):
                iam_client.deactivate_mfa_device(
                    UserName=user_name,
                    SerialNumber=mfa['SerialNumber'],
                )
        except ClientError:
            pass

    try:
        iam_client.delete_user(UserName=user_name)
        logger.info("Deleted IAM user: %s", user_name)
    except ClientError as e:
        raise RuntimeError(iam_client_error_message(e)) from e


# ===================================================================
# Access Key Management & Rotation
# ===================================================================


def create_access_key(
    iam_client: boto3.client,
    user_name: str,
) -> Dict[str, Any]:
    """Create a new access key for a user.

    IMPORTANT: The SecretAccessKey is ONLY visible in this response.
    You must store it securely immediately — it's never shown again.

    Args:
        iam_client: Boto3 IAM client.
        user_name: User name.

    Returns:
        Access key dict WITH SecretAccessKey visible.
    """
    try:
        response = iam_client.create_access_key(UserName=user_name)
        key = response['AccessKey']

        # Log ONLY the AccessKeyId, NEVER the secret
        logger.info(
            "Created access key for user %s: id=%s, created=%s",
            user_name,
            key['AccessKeyId'],
            key.get('CreateDate'),
        )

        return key

    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', '')
        if error_code == 'LimitExceeded':
            raise RuntimeError(
                f"User '{user_name}' already has maximum 2 access keys. "
                f"Delete or rotate one first."
            ) from e
        raise RuntimeError(iam_client_error_message(e)) from e


def list_access_keys(
    iam_client: boto3.client,
    user_name: str,
) -> List[Dict[str, Any]]:
    """List access keys for a user (does NOT include secrets).

    Args:
        iam_client: Boto3 IAM client.
        user_name: User name.

    Returns:
        List of access key metadata (AccessKeyId, Status, CreateDate).
    """
    try:
        response = iam_client.list_access_keys(UserName=user_name)
        keys = response.get('AccessKeyMetadata', [])

        logger.debug(
            "User %s has %d access keys",
            user_name,
            len(keys),
        )
        return keys

    except ClientError as e:
        raise RuntimeError(iam_client_error_message(e)) from e


def update_access_key_status(
    iam_client: boto3.client,
    user_name: str,
    access_key_id: str,
    active: bool,
) -> None:
    """Activate or deactivate an access key.

    Args:
        iam_client: Boto3 IAM client.
        user_name: User name.
        access_key_id: Access key ID.
        active: True to activate, False to deactivate.
    """
    status = 'Active' if active else 'Inactive'

    try:
        iam_client.update_access_key(
            UserName=user_name,
            AccessKeyId=access_key_id,
            Status=status,
        )
        logger.info(
            "Updated access key %s for user %s: status=%s",
            access_key_id,
            user_name,
            status,
        )
    except ClientError as e:
        raise RuntimeError(iam_client_error_message(e)) from e


def delete_access_key(
    iam_client: boto3.client,
    user_name: str,
    access_key_id: str,
) -> None:
    """Delete an access key.

    Args:
        iam_client: Boto3 IAM client.
        user_name: User name.
        access_key_id: Access key ID to delete.
    """
    try:
        iam_client.delete_access_key(
            UserName=user_name,
            AccessKeyId=access_key_id,
        )
        logger.info(
            "Deleted access key %s for user %s",
            access_key_id,
            user_name,
        )
    except ClientError as e:
        raise RuntimeError(iam_client_error_message(e)) from e


def rotate_access_keys(
    iam_client: boto3.client,
    user_name: str,
    on_new_key_created: Any = None,  # callback to update config/secrets
) -> Dict[str, Any]:
    """Safely rotate access keys with zero downtime.

    Rotation workflow:
    1. List existing keys (max 2 per user)
    2. If 2 keys exist: disable older one, then delete, then create new
    3. If 1 key exists: create second key
    4. Callback to update applications with new key
    5. Old key remains ACTIVE for transition period

    Args:
        iam_client: Boto3 IAM client.
        user_name: User name.
        on_new_key_created: Optional callback(new_key_dict) for secrets update.

    Returns:
        New access key dict (WITH SecretAccessKey visible only once).
    """
    existing_keys = list_access_keys(iam_client, user_name)

    if len(existing_keys) >= 2:
        # User has max keys — need to remove one first
        # Sort by date to identify the older key
        sorted_keys = sorted(
            existing_keys,
            key=lambda k: k.get('CreateDate', datetime.min),
        )
        key_to_remove = sorted_keys[0]  # oldest

        # Disable first (safety net), then delete
        update_access_key_status(
            iam_client,
            user_name,
            key_to_remove['AccessKeyId'],
            active=False,
        )
        delete_access_key(
            iam_client,
            user_name,
            key_to_remove['AccessKeyId'],
        )

    # Create new access key (NOW we have slot)
    new_key = create_access_key(iam_client, user_name)

    # Notify callback to update config/secrets manager
    if on_new_key_created:
        try:
            on_new_key_created(new_key)
        except Exception as e:
            logger.error(
                "Callback failed for new key %s: %s",
                new_key['AccessKeyId'],
                e,
            )
            # Don't fail rotation — manual intervention needed

    logger.info(
        "Access key rotation initiated for user %s. New key: %s",
        user_name,
        new_key['AccessKeyId'],
    )

    return new_key


def get_access_key_last_used(
    iam_client: boto3.client,
    access_key_id: str,
) -> Dict[str, Any] | None:
    """Get when an access key was last used.

    Useful for identifying unused keys that can be deleted.

    Args:
        iam_client: Boto3 IAM client.
        access_key_id: Access key ID.

    Returns:
        Dict with LastUsedDate, Region, ServiceName, or None if never used.
    """
    try:
        response = iam_client.get_access_key_last_used(AccessKeyId=access_key_id)
        return response.get('AccessKeyLastUsed')
    except ClientError as e:
        raise RuntimeError(iam_client_error_message(e)) from e
```

### Pattern 3: IAM Roles, Trust Policies, and STS AssumeRole

```python
"""IAM Roles, Trust Policies, and STS operations.

Roles vs Users:
- Roles have NO permanent credentials (no access keys, no password)
- Roles are ASSUMED by principals (users, applications, services)
- When you assume a role, you get TEMPORARY credentials
- Temporary credentials expire (15 min to 12 hours, configurable)

Trust Policy vs Permissions Policy:
- Trust Policy (AssumeRolePolicyDocument): WHO can assume the role
  - Principals: IAM users, roles, AWS services, AWS accounts, SAML providers, OIDC
- Permissions Policy: WHAT the role can do (S3, DynamoDB, etc.)

Use cases:
1. Cross-account access (Account A → Account B)
2. EC2/Lambda/ECS applications (avoid access keys)
3. MFA-required elevated access
4. Third-party/SaaS provider access (external ID)
5. Identity federation (web identity, SAML)
"""

from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)


def create_trust_policy_for_account(
    trusting_account_id: str,
    external_id: str | None = None,
    require_mfa: bool = False,
) -> Dict[str, Any]:
    """Create a trust policy allowing another account to assume this role.

    Args:
        trusting_account_id: The AWS account that is allowed to assume.
        external_id: Optional external ID for third-party access (prevents confused deputy).
        require_mfa: Whether MFA is required to assume.

    Returns:
        Trust policy document (dict, can be json.dumps() for create_role).
    """
    principal_arn = f"arn:aws:iam::{trusting_account_id}:root"

    statement: Dict[str, Any] = {
        'Effect': 'Allow',
        'Principal': {'AWS': principal_arn},
        'Action': 'sts:AssumeRole',
    }

    # Conditions
    conditions: Dict[str, Any] = {}

    if external_id:
        conditions['StringEquals'] = {'sts:ExternalId': external_id}

    if require_mfa:
        conditions['Bool'] = {'aws:MultiFactorAuthPresent': 'true'}

    if conditions:
        statement['Condition'] = conditions

    policy: Dict[str, Any] = {
        'Version': '2012-10-17',
        'Statement': [statement],
    }

    return policy


def create_trust_policy_for_service(
    service: str,  # e.g., 'ec2.amazonaws.com', 'lambda.amazonaws.com'
) -> Dict[str, Any]:
    """Create a trust policy allowing an AWS service to assume the role.

    Common services:
    - EC2: ec2.amazonaws.com
    - Lambda: lambda.amazonaws.com
    - ECS tasks: ecs-tasks.amazonaws.com
    - CodeBuild: codebuild.amazonaws.com
    - Glue: glue.amazonaws.com

    Args:
        service: AWS service principal (e.g., 'ec2.amazonaws.com').

    Returns:
        Trust policy document.
    """
    policy: Dict[str, Any] = {
        'Version': '2012-10-17',
        'Statement': [
            {
                'Effect': 'Allow',
                'Principal': {'Service': service},
                'Action': 'sts:AssumeRole',
            }
        ],
    }
    return policy


def create_iam_role(
    iam_client: boto3.client,
    role_name: str,
    assume_role_policy_document: Dict[str, Any] | str,
    description: str | None = None,
    max_session_duration: int = 3600,  # seconds, default 1h
    permissions_boundary: str | None = None,
    tags: List[Dict[str, str]] | None = None,
    path: str = '/',
) -> Dict[str, Any]:
    """Create a new IAM role.

    Args:
        iam_client: Boto3 IAM client.
        role_name: Role name.
        assume_role_policy_document: Trust policy (dict or JSON string).
        description: Optional description.
        max_session_duration: Max duration of temp credentials (900-43200 seconds).
        permissions_boundary: Optional policy ARN for permission boundary.
        tags: Optional tags.
        path: Optional path.

    Returns:
        Created role dict.
    """
    # Convert dict to JSON string if needed
    if isinstance(assume_role_policy_document, dict):
        trust_policy_json = json.dumps(assume_role_policy_document)
    else:
        trust_policy_json = assume_role_policy_document

    try:
        kwargs: Dict[str, Any] = {
            'RoleName': role_name,
            'AssumeRolePolicyDocument': trust_policy_json,
            'Path': path,
            'MaxSessionDuration': max_session_duration,
        }
        if description:
            kwargs['Description'] = description
        if permissions_boundary:
            kwargs['PermissionsBoundary'] = permissions_boundary
        if tags:
            kwargs['Tags'] = tags

        response = iam_client.create_role(**kwargs)
        role = response['Role']

        logger.info(
            "Created IAM role: %s (arn=%s, created=%s)",
            role['RoleName'],
            role['Arn'],
            role.get('CreateDate'),
        )
        return role

    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', '')
        if error_code == 'EntityAlreadyExists':
            raise ValueError(f"IAM role '{role_name}' already exists") from e
        if error_code == 'MalformedPolicyDocument':
            raise ValueError(f"Trust policy has syntax error: {e}") from e
        raise RuntimeError(iam_client_error_message(e)) from e


def get_iam_role(
    iam_client: boto3.client,
    role_name: str,
) -> Dict[str, Any] | None:
    """Get an IAM role by name.

    Args:
        iam_client: Boto3 IAM client.
        role_name: Role name.

    Returns:
        Role dict if found, None otherwise.
    """
    try:
        response = iam_client.get_role(RoleName=role_name)
        return response['Role']
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', '')
        if error_code == 'NoSuchEntity':
            return None
        raise RuntimeError(iam_client_error_message(e)) from e


def attach_role_policy(
    iam_client: boto3.client,
    role_name: str,
    policy_arn: str,
) -> None:
    """Attach a managed policy to a role.

    Args:
        iam_client: Boto3 IAM client.
        role_name: Role name.
        policy_arn: Managed policy ARN.
    """
    try:
        iam_client.attach_role_policy(
            RoleName=role_name,
            PolicyArn=policy_arn,
        )
        logger.info(
            "Attached policy %s to role %s",
            policy_arn,
            role_name,
        )
    except ClientError as e:
        raise RuntimeError(iam_client_error_message(e)) from e


def assume_role(
    sts_client: boto3.client,
    role_arn: str,
    role_session_name: str,
    external_id: str | None = None,
    mfa_serial_number: str | None = None,
    mfa_token_code: str | None = None,
    duration_seconds: int = 3600,
    policy_arns: List[Dict[str, str]] | None = None,
) -> Dict[str, Any]:
    """Assume an IAM role to get temporary credentials.

    This is the RECOMMENDED way to get credentials for:
    - Cross-account access
    - MFA-protected elevated operations
    - Applications (prefer instance roles over this for EC2/Lambda)

    Args:
        sts_client: Boto3 STS client.
        role_arn: ARN of the role to assume.
        role_session_name: Name for this session (appears in CloudTrail, useful for audit).
        external_id: Optional external ID for third-party access.
        mfa_serial_number: Optional MFA device serial (required if role trusts only with MFA).
        mfa_token_code: Optional 6-digit MFA code (required if mfa_serial_number provided).
        duration_seconds: Session duration (900-43200 = 15 min to 12 hours).
        policy_arns: Optional session policies to restrict permissions further.

    Returns:
        Dict with: Credentials (AccessKeyId, SecretAccessKey, SessionToken, Expiration),
                  AssumedRoleUser, PackedPolicySize.

    Example:
        creds = assume_role(
            sts_client,
            'arn:aws:iam::123456789012:role/CrossAccountAdmin',
            'my-app-session',
        )
        # Use credentials to create boto3 client
        s3 = boto3.client(
            's3',
            aws_access_key_id=creds['Credentials']['AccessKeyId'],
            aws_secret_access_key=creds['Credentials']['SecretAccessKey'],
            aws_session_token=creds['Credentials']['SessionToken'],
        )
    """
    try:
        kwargs: Dict[str, Any] = {
            'RoleArn': role_arn,
            'RoleSessionName': role_session_name,
            'DurationSeconds': duration_seconds,
        }

        if external_id:
            kwargs['ExternalId'] = external_id

        if mfa_serial_number:
            kwargs['SerialNumber'] = mfa_serial_number
            if mfa_token_code:
                kwargs['TokenCode'] = mfa_token_code

        if policy_arns:
            kwargs['PolicyArns'] = policy_arns

        response = sts_client.assume_role(**kwargs)

        logger.info(
            "Assumed role %s: session=%s, expires=%s",
            role_arn,
            role_session_name,
            response['Credentials']['Expiration'],
        )

        return response

    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', '')

        if error_code == 'AccessDenied':
            raise RuntimeError(
                f"Access denied when assuming role {role_arn}. "
                f"Check: trust policy, your IAM permissions, MFA requirement."
            ) from e
        if error_code == 'ExpiredToken':
            raise RuntimeError("Token expired") from e

        raise RuntimeError(iam_client_error_message(e)) from e


def get_session_token_with_mfa(
    sts_client: boto3.client,
    mfa_serial_number: str,
    mfa_token_code: str,
    duration_seconds: int = 3600,
) -> Dict[str, Any]:
    """Get temporary credentials for an IAM user with MFA verification.

    Use this when:
    - Your IAM user needs to call MFA-protected APIs
    - You have a role trust policy that requires aws:MultiFactorAuthPresent

    Args:
        sts_client: Boto3 STS client.
        mfa_serial_number: MFA device ARN (e.g., 'arn:aws:iam::123:mfa/user').
        mfa_token_code: 6-digit code from MFA device/app.
        duration_seconds: Session duration (900-129600 seconds).

    Returns:
        Dict with Credentials.
    """
    try:
        response = sts_client.get_session_token(
            SerialNumber=mfa_serial_number,
            TokenCode=mfa_token_code,
            DurationSeconds=duration_seconds,
        )

        logger.info(
            "Got session token with MFA: expires=%s",
            response['Credentials']['Expiration'],
        )

        return response

    except ClientError as e:
        raise RuntimeError(iam_client_error_message(e)) from e


def create_boto3_client_from_credentials(
    credentials: Dict[str, Any],
    service_name: str,
    region_name: str = 'us-east-1',
) -> boto3.client:
    """Create a boto3 client using assumed/temporary credentials.

    Args:
        credentials: Credentials dict from assume_role or get_session_token.
                     Must have: AccessKeyId, SecretAccessKey, SessionToken.
        service_name: AWS service name ('s3', 'ec2', etc.).
        region_name: AWS region.

    Returns:
        Configured boto3 client using temp credentials.
    """
    creds = credentials.get('Credentials', credentials)

    client = boto3.client(
        service_name,
        region_name=region_name,
        aws_access_key_id=creds['AccessKeyId'],
        aws_secret_access_key=creds['SecretAccessKey'],
        aws_session_token=creds['SessionToken'],
    )

    return client
```

### Pattern 4: Policy Validation & Least Privilege

```python
"""IAM Policy validation and least privilege best practices.

Always validate policies BEFORE creating/updating:
1. Syntax validation (JSON valid, correct structure)
2. Service validation (actions exist for services)
3. Resource validation (ARNs match service pattern)
4. Access Analyzer comprehensive validation

Managed Policy vs Inline Policy:
- Managed: Reusable, versioned (5 versions), central management — PREFERRED
- Inline: Embedded directly in user/group/role, deleted with parent — only for one-off

Permission Boundaries:
- Limit the MAXIMUM permissions an identity can have
- Useful for:
  - Delegating admin to developers safely
  - Preventing privilege escalation
  - Setting guardrails on roles/users
"""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, List, Optional

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)


# Common AWS managed policies (ARNs)
AWS_MANAGED_POLICIES = {
    'AdministratorAccess': 'arn:aws:iam::aws:policy/AdministratorAccess',
    'PowerUserAccess': 'arn:aws:iam::aws:policy/PowerUserAccess',
    'ReadOnlyAccess': 'arn:aws:iam::aws:policy/ReadOnlyAccess',
    'AmazonS3FullAccess': 'arn:aws:iam::aws:policy/AmazonS3FullAccess',
    'AmazonS3ReadOnlyAccess': 'arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess',
    'AmazonDynamoDBFullAccess': 'arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess',
    'AmazonEC2FullAccess': 'arn:aws:iam::aws:policy/AmazonEC2FullAccess',
    'AWSLambda_FullAccess': 'arn:aws:iam::aws:policy/AWSLambda_FullAccess',
    'IAMFullAccess': 'arn:aws:iam::aws:policy/IAMFullAccess',
}


def validate_iam_policy_document(
    policy_document: Dict[str, Any] | str,
    policy_type: str = 'IDENTITY_POLICY',  # or RESOURCE_POLICY
) -> Dict[str, Any]:
    """Validate a policy document using IAM validate_policy API.

    Validates:
    - JSON syntax
    - Policy grammar
    - Service/action/resource matching

    Args:
        policy_document: Policy dict or JSON string.
        policy_type: Type of policy: IDENTITY_POLICY or RESOURCE_POLICY.

    Returns:
        Validation result with:
        - Valid: True/False
        - Warnings: list of warnings
        - Errors: list of errors
    """
    if isinstance(policy_document, dict):
        policy_json = json.dumps(policy_document)
    else:
        policy_json = policy_document

    iam_client = get_iam_client()

    try:
        response = iam_client.validate_policy(
            PolicyDocument=policy_json,
            ValidatePolicyResourceType=policy_type,
        )

        result = {
            'Valid': len(response.get('Findings', [])) == 0,
            'Findings': response.get('Findings', []),
        }

        if not result['Valid']:
            logger.warning(
                "Policy validation found %d issues",
                len(result['Findings']),
            )
            for finding in result['Findings']:
                logger.warning(
                    "  [%s] %s: %s",
                    finding.get('Severity'),
                    finding.get('IssueCode'),
                    finding.get('FindingDetails'),
                )

        return result

    except ClientError as e:
        raise RuntimeError(iam_client_error_message(e)) from e


def validate_policy_with_access_analyzer(
    accessanalyzer_client: boto3.client,
    analyzer_arn: str,
    policy_document: Dict[str, Any] | str,
    policy_type: str = 'IDENTITY_POLICY',
) -> Dict[str, Any]:
    """Validate policy using IAM Access Analyzer (more comprehensive).

    Requires:
    - Access Analyzer enabled in your account
    - An external access analyzer or account analyzer

    Args:
        accessanalyzer_client: Boto3 Access Analyzer client.
        analyzer_arn: ARN of your Access Analyzer.
        policy_document: Policy dict or JSON string.
        policy_type: Type: IDENTITY_POLICY, RESOURCE_POLICY, SERVICE_CONTROL_POLICY.

    Returns:
        Validation result with findings.
    """
    if isinstance(policy_document, dict):
        policy_json = json.dumps(policy_document)
    else:
        policy_json = policy_document

    try:
        response = accessanalyzer_client.validate_policy(
            policyDocument=policy_json,
            policyType=policy_type,
            locale='EN',
        )

        result = {
            'Valid': len(response.get('findings', [])) == 0,
            'Findings': response.get('findings', []),
        }

        return result

    except ClientError as e:
        raise RuntimeError(f"Access Analyzer error: {e}") from e


def create_managed_policy(
    iam_client: boto3.client,
    policy_name: str,
    policy_document: Dict[str, Any] | str,
    description: str | None = None,
    path: str = '/',
    tags: List[Dict[str, str]] | None = None,
    validate_first: bool = True,
) -> Dict[str, Any]:
    """Create a customer managed policy.

    Prefer managed policies over inline policies:
    - Reusable across multiple identities
    - Versioned (up to 5 versions)
    - Centralized management
    - Can set default version and roll back

    Args:
        iam_client: Boto3 IAM client.
        policy_name: Policy name.
        policy_document: Policy dict or JSON string.
        description: Optional description.
        path: Optional path.
        tags: Optional tags.
        validate_first: Validate with IAM API before creating.

    Returns:
        Created policy dict.
    """
    if isinstance(policy_document, dict):
        policy_json = json.dumps(policy_document)
    else:
        policy_json = policy_document

    # Validate first if requested
    if validate_first:
        validation = validate_iam_policy_document(policy_json)
        if not validation['Valid']:
            raise ValueError(
                f"Policy validation failed: {validation['Findings']}"
            )

    try:
        kwargs: Dict[str, Any] = {
            'PolicyName': policy_name,
            'PolicyDocument': policy_json,
            'Path': path,
        }
        if description:
            kwargs['Description'] = description
        if tags:
            kwargs['Tags'] = tags

        response = iam_client.create_policy(**kwargs)
        policy = response['Policy']

        logger.info(
            "Created managed policy: %s (arn=%s, version=%s)",
            policy['PolicyName'],
            policy['Arn'],
            policy.get('DefaultVersionId'),
        )
        return policy

    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', '')
        if error_code == 'EntityAlreadyExists':
            raise ValueError(f"Policy '{policy_name}' already exists") from e
        if error_code == 'MalformedPolicyDocument':
            raise ValueError(f"Policy syntax error: {e}") from e
        raise RuntimeError(iam_client_error_message(e)) from e


def create_policy_version(
    iam_client: boto3.client,
    policy_arn: str,
    policy_document: Dict[str, Any] | str,
    set_as_default: bool = True,
) -> Dict[str, Any]:
    """Create a new version of a managed policy.

    Important:
    - Max 5 versions per policy
    - Oldest non-default version is auto-deleted when at limit
    - Use set_as_default=True to make this version active

    Args:
        iam_client: Boto3 IAM client.
        policy_arn: Policy ARN.
        policy_document: New policy document.
        set_as_default: Make this the default (active) version.

    Returns:
        Policy version dict.
    """
    if isinstance(policy_document, dict):
        policy_json = json.dumps(policy_document)
    else:
        policy_json = policy_document

    try:
        response = iam_client.create_policy_version(
            PolicyArn=policy_arn,
            PolicyDocument=policy_json,
            SetAsDefault=set_as_default,
        )
        version = response['PolicyVersion']

        logger.info(
            "Created policy version %s for %s (default=%s)",
            version['VersionId'],
            policy_arn,
            set_as_default,
        )
        return version

    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', '')
        if error_code == 'LimitExceeded':
            raise RuntimeError(
                f"Policy {policy_arn} already has max 5 versions. "
                f"Delete old versions before creating new one."
            ) from e
        raise RuntimeError(iam_client_error_message(e)) from e


def list_policy_versions(
    iam_client: boto3.client,
    policy_arn: str,
) -> List[Dict[str, Any]]:
    """List all versions of a managed policy.

    Args:
        iam_client: Boto3 IAM client.
        policy_arn: Policy ARN.

    Returns:
        List of policy versions sorted newest first.
    """
    try:
        response = iam_client.list_policy_versions(PolicyArn=policy_arn)
        versions = response.get('Versions', [])

        # Sort by create date (newest first)
        versions.sort(key=lambda v: v.get('CreateDate'), reverse=True)

        return versions

    except ClientError as e:
        raise RuntimeError(iam_client_error_message(e)) from e


def delete_policy_version(
    iam_client: boto3.client,
    policy_arn: str,
    version_id: str,
) -> None:
    """Delete a policy version.

    Note: Cannot delete the default version.

    Args:
        iam_client: Boto3 IAM client.
        policy_arn: Policy ARN.
        version_id: Version ID (e.g., 'v1', 'v2').
    """
    try:
        iam_client.delete_policy_version(
            PolicyArn=policy_arn,
            VersionId=version_id,
        )
        logger.info("Deleted policy version %s for %s", version_id, policy_arn)
    except ClientError as e:
        raise RuntimeError(iam_client_error_message(e)) from e


# ===================================================================
# Example Policy Templates (Least Privilege)
# ===================================================================


def create_s3_readonly_policy_for_bucket(bucket_name: str) -> Dict[str, Any]:
    """Create S3 read-only policy for a specific bucket (least privilege).

    Args:
        bucket_name: Bucket name.

    Returns:
        Policy document dict.
    """
    policy: Dict[str, Any] = {
        'Version': '2012-10-17',
        'Statement': [
            {
                'Effect': 'Allow',
                'Action': [
                    's3:GetObject',
                    's3:ListBucket',
                ],
                'Resource': [
                    f'arn:aws:s3:::{bucket_name}',
                    f'arn:aws:s3:::{bucket_name}/*',
                ],
            }
        ],
    }
    return policy


def create_assume_role_policy_requiring_mfa(
    trusted_principal_arn: str,
) -> Dict[str, Any]:
    """Create trust policy that REQUIRES MFA to assume the role.

    This is a security best practice for sensitive/admin roles.

    Args:
        trusted_principal_arn: Principal ARN allowed to assume.

    Returns:
        Trust policy document.
    """
    policy: Dict[str, Any] = {
        'Version': '2012-10-17',
        'Statement': [
            {
                'Effect': 'Allow',
                'Principal': {'AWS': trusted_principal_arn},
                'Action': 'sts:AssumeRole',
                'Condition': {
                    'Bool': {'aws:MultiFactorAuthPresent': 'true'}
                },
            }
        ],
    }
    return policy


def create_trust_policy_with_external_id(
    trusted_account_id: str,
    external_id: str,
) -> Dict[str, Any]:
    """Create trust policy with ExternalId (prevents confused deputy problem).

    ExternalId is critical for third-party/SaaS provider access.
    More info: https://docs.aws.amazon.com/IAM/latest/UserGuide/confused-deputy.html

    Args:
        trusted_account_id: AWS account ID of the third party.
        external_id: External ID (agreed upon with third party).

    Returns:
        Trust policy document.
    """
    policy: Dict[str, Any] = {
        'Version': '2012-10-17',
        'Statement': [
            {
                'Effect': 'Allow',
                'Principal': {'AWS': f'arn:aws:iam::{trusted_account_id}:root'},
                'Action': 'sts:AssumeRole',
                'Condition': {
                    'StringEquals': {'sts:ExternalId': external_id}
                },
            }
        ],
    }
    return policy
```

---

## Constraints

### MUST DO

- Use default boto3 credential chain (never hardcode credentials)
- Verify identity on startup with `sts.get_caller_identity()`
- Prefer IAM roles over IAM users for applications (no long-term credentials)
- Use `sts.assume_role()` for cross-account access
- Enforce MFA via condition `aws:MultiFactorAuthPresent` in trust policies
- Use `ExternalId` for third-party cross-account access (confused deputy prevention)
- Validate policies with `validate_policy()` or Access Analyzer before deployment
- Rotate access keys: create → migrate → disable → delete (zero downtime)
- Use permission boundaries to limit maximum permissions
- Use managed policies (reusable, versioned) over inline policies
- Keep max 5 policy versions; delete old versions when adding new
- Store access key secrets securely at creation time (only visible once)
- Use IAM Access Analyzer to find overly permissive policies

### MUST NOT DO

- NEVER hardcode credentials in source code (no `aws_access_key_id=...` in boto3.client)
- NEVER commit `~/.aws/credentials` or .env with credentials to git
- NEVER use access keys for EC2/Lambda/ECS (use instance profiles/execution roles)
- NEVER share access keys between users/services (1:1 mapping for audit)
- NEVER delete the only access key without verifying replacement works
- NEVER use `AdministratorAccess` when more specific policies work (least privilege)
- NEVER use `Resource: "*"` when specific ARNs work
- NEVER use `Action: "*"` when specific actions work
- NEVER ignore policy validation — always validate before creating/updating
- NEVER delete the default policy version (delete non-default versions instead)
- NEVER disable MFA for admin/elevated access roles
- NEVER skip pagination in list operations (IAM truncates large results)

---

## Output Template

When implementing AWS IAM integrations, produce:

1. **Client Initialization** — `boto3.client('iam')`, `boto3.client('sts')` using default credential chain
2. **Identity Verification** — `verify_caller_identity()` with `get_sts_client()`
3. **User Management** — `create_iam_user()`, `get_iam_user()`, `list_iam_users()`, `delete_iam_user()`
4. **Access Key Rotation** — `rotate_access_keys()` with zero-downtime workflow
5. **Role Creation** — `create_iam_role()` with proper trust policy
6. **Assume Role** — `assume_role()` for cross-account/MFA scenarios
7. **Policy Validation** — `validate_iam_policy_document()` before creation
8. **Policy Templates** — Least privilege examples for common services
9. **Error Handling** — `iam_client_error_message()` parsing ClientError
10. **Permission Boundary Example** — Safe delegation pattern

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-entra-id-api` | Microsoft Entra ID (Azure AD) — alternative cloud identity |
| `coding-okta-api` | Okta — workforce and CIAM identity platform |
| `coding-auth0-api` | Auth0 — customer identity CIAM platform |
| `coding-vault-api` | HashiCorp Vault — secrets management and identities |
| `coding-azure-sdk` | Azure SDK — for broader Azure resource patterns |

---

## Live References

| Resource | URL |
|----------|-----|
| Boto3 IAM Service Reference | https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/iam.html |
| Boto3 STS Service Reference | https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/sts.html |
| IAM User Guide | https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction.html |
| IAM Best Practices | https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html |
| Policy Evaluation Logic | https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html |
| STS AssumeRole | https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html |
| Access Analyzer | https://docs.aws.amazon.com/IAM/latest/UserGuide/what-is-access-analyzer.html |
| Permission Boundaries | https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html |
| MFA in IAM | https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa.html |
| Confused Deputy Problem | https://docs.aws.amazon.com/IAM/latest/UserGuide/confused-deputy.html |
| IAM Policy Validator | https://docs.aws.amazon.com/IAM/latest/APIReference/API_ValidatePolicy.html |

---

## Common IAM Error Codes

| Error Code | Meaning |
|------------|---------|
| `EntityAlreadyExists` | User/role/policy with that name already exists |
| `NoSuchEntity` | User/role/policy not found |
| `LimitExceeded` | Max 2 access keys per user, max 5 policy versions |
| `MalformedPolicyDocument` | Policy JSON syntax or structure is invalid |
| `DeleteConflict` | Cannot delete entity with attached resources (keys, policies, groups) |
| `InvalidInput` | Parameter validation failed (e.g., invalid ARN, invalid name) |
| `AccessDenied` | Insufficient permissions to perform the operation |
| `UnmodifiableEntity` | Cannot modify an AWS managed policy |
| `DuplicateCredential` | Access key ID already exists |
