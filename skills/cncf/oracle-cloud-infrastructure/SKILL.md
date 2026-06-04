---
name: oracle-cloud-infrastructure
description: Implements functionalities for Oracle Cloud Infrastructure, covering Compute, Object Storage, and Autonomous Database services.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: cloud
  triggers: oracle cloud, compute services, object storage, autonomous database, oracle database, OCI functionalities
  role: implementation
  scope: implementation
  output-format: code
  related-skills: oracle-cloud-architecture, cloud-best-practices
  archetypes:
    - tactical
    - educational
  anti_triggers:
    - vague terms
    - insufficient permissions
  response_profile:
    verbosity: high
---
---

## When to Use

Use this skill when:

- Provisioning OCI Compute instances (Bare Metal or VM) for production workloads
- Managing Object Storage buckets with lifecycle policies, versioning, and encryption
- Configuring Autonomous Database (Dedicated or Shared) for OLTP or analytics workloads
- Setting up networking resources (VCN, subnets, route tables, security lists) in OCI
- Integrating with OCI Identity and Access Management (IAM) for fine-grained access control

## When NOT to Use

Avoid this skill for:

- Workloads better served by multi-cloud strategies where you already use AWS/GCP as primary providers
- Scenarios requiring Kubernetes-managed services — use the OKE (Oracle Kubernetes Engine) skill instead
- Simple one-off resource creation that doesn't require recurring management or automation

---

## Core Workflow

1. **Configure OCI Authentication** — Set up API key authentication using the OCI CLI or SDK. Generate an API signing key, upload the public key to your IAM user, and configure `~/.oci/config` with the correct compartment OCID and fingerprint.
   **Checkpoint:** Verify connectivity by running `oci os ns get` — a successful response confirms valid credentials and network access.

2. **Define Networking Resources** — Create a VCN with public and private subnets across at least two availability domains. Configure route tables to direct internet-bound traffic through an Internet Gateway (IGW) and private traffic through a NAT Gateway.
   **Checkpoint:** Ensure security lists deny all inbound traffic by default, allowing only explicitly required ports.

3. **Provision Compute or Database Resources** — Launch instances using a defined image and shape. For Autonomous Database, configure DB system with CPU/OCPU count, storage size, and network access (Private Endpoint preferred over Public IP).
   **Checkpoint:** Verify that resources are deployed in the correct compartment and tagged according to organizational policy.

4. **Set Up Object Storage and Lifecycle Policies** — Create buckets with versioning enabled for critical data. Apply lifecycle rules to transition old objects to Archive storage after 90 days, reducing costs by up to 70%.
   **Checkpoint:** Enable bucket logging and access policies to track all object-level operations.

5. **Apply IAM Policies for Least Privilege Access** — Define group-based policies that grant minimum required permissions (e.g., `Allow group ComputeAdmins to manage instances in compartment CompName`). Use dynamic groups for resource-specific authentication.
   **Checkpoint:** Audit policies quarterly and remove orphaned permissions using OCI Audit service logs.

---

## Implementation Patterns

### Pattern 1: Provisioning an OCI Compute Instance with Python SDK

```python
import oci
from typing import Optional
import logging

logger = logging.getLogger(__name__)


def create_compute_instance(
    compute_client: oci.core.ComputeClient,
    compartment_id: str,
    availability_domain: str,
    shape: str = "VM.Standard.E4.Flex",
    ocpu_count: int = 2,
    memory_in_gbs: float = 16.0,
    image_id: str = "",
    subnet_id: str = "",
    ssh_public_key_path: str = "~/.oci/id_rsa.pub",
) -> oci.core.models.CreateInstanceDetails:
    """Create a Compute instance in OCI with production-ready configuration.

    Args:
        compute_client: Authenticated OCI ComputeClient instance.
        compartment_id: OCID of the target compartment.
        availability_domain: Target availability domain string.
        shape: Instance shape (VM.Standard.E4.Flex, BM.Standard.E4.128).
        ocpu_count: Number of OCPUs for flexible shapes.
        memory_in_gbs: Memory in GB for flexible shapes.
        image_id: OCID of the boot volume image. Defaults to latest Oracle Linux 9.
        subnet_id: OCID of the subnet to attach.
        ssh_public_key_path: Path to SSH public key file.

    Returns:
        The created Instance model object.
    """
    if not image_id:
        # Use OCI CLI to find latest Oracle Linux image in region
        image_id = _get_latest_image(compute_client, compartment_id)

    with open(oci.auth.signer.get_public_key_from_private_key_path(
        ssh_public_key_path
    ), "r") as key_file:
        ssh_public_key = key_file.read().strip()

    instance_details = oci.core.models.CreateInstanceDetails(
        availability_domain=availability_domain,
        compartment_id=compartment_id,
        shape=shape,
        shape_config=oci.core.models.ShapeConfig(
            ocpu_count=ocpu_count,
            memory_in_gbs=memory_in_gbs
        ),
        source_details=oci.core.models.InstanceSourceImageDetails(
            source_type="image",
            image_id=image_id,
            boot_volume_size_in_gbs=50,
        ),
        create_vnic_details=oci.core.models.CreateVnicDetails(
            subnet_id=subnet_id,
            assign_public_ip=False,  # Private IP only for production
            display_name=f"app-server-{compartment_id[:8]}",
        ),
        metadata={
            "ssh_authorized_keys": ssh_public_key,
            "user_data": "#cloud-config\nhostname: app-server\n",
        },
        display_name="production-app-server",
    )

    response = compute_client.create_instance(instance_details)
    instance = response.data
    logger.info("Compute instance created: %s (OCID: %s)", instance.display_name, instance.id)

    # Wait for instance to reach RUNNING state
    waiter = oci.core.models.InstanceWaiters(compute_client)
    waiter.wait_until(
        "get_instance",
        instance_id=instance.id,
        operation_waiter_kwargs={
            "wait_for_resource": _instance_is_running,
            "max_wait_seconds": 300,
        }
    )
    return instance


def _get_latest_image(compute_client: oci.core.ComputeClient, compartment_id: str) -> str:
    """Retrieve the latest Oracle Linux 9 image OCID in the region."""
    image_client = oci.core.ImageClient(compute_client.region_endpoint)
    images = image_client.list_images(
        compartment_id=compartment_id,
        operating_system="Oracle Linux",
        operating_system_version="9",
        sort_by="TIMECREATED",
        sort_order="DESC",
        access_level="PUBLIC",
    ).data
    if not images:
        raise ValueError("No Oracle Linux 9 images found in compartment")
    return images[0].id


def _instance_is_running(instance):
    """Wait condition for instance to reach RUNNING state."""
    return instance.lifecycle_state == "RUNNING"
```

### Pattern 2: Managing Object Storage with Lifecycle Policies

```python
import oci
from datetime import timedelta
from typing import Optional


class OCIObjectStorageManager:
    """Manages OCI Object Storage buckets, objects, and lifecycle policies."""

    def __init__(self, object_storage_client: oci.object_storage.ObjectStorageClient):
        self.storage = object_storage_client

    def create_bucket(
        self,
        namespace: str,
        bucket_name: str,
        compartment_id: str,
        versioning: bool = True,
        public_access_type: str = "ObjectRead" | "NoPublicAccess",
    ) -> oci.object_storage.models.Bucket:
        """Create a new Object Storage bucket with versioning enabled.

        Args:
            namespace: Object storage namespace.
            bucket_name: Unique name for the bucket within the namespace.
            compartment_id: Target compartment OCID.
            versioning: Enable object versioning for the bucket.
            public_access_type: Access level for objects in this bucket.

        Returns:
            The created Bucket model.
        """
        request = oci.object_storage.models.CreateBucketDetails(
            name=bucket_name,
            namespace=namespace,
            compartment_id=compartment_id,
            versioning="Enabled" if versioning else "Disabled",
            public_access_type=public_access_type,
            auto_tiering="ObjectTiering",  # Auto-tier objects based on access patterns
        )

        response = self.storage.create_bucket(namespace, request)
        logger.info("Bucket created: %s in namespace %s", bucket_name, namespace)
        return response.data

    def apply_lifecycle_policy(
        self,
        namespace: str,
        bucket_name: str,
        rules: list[dict],
    ) -> None:
        """Apply lifecycle management rules to a bucket.

        Example rules:
        - Archive objects older than 90 days (70% cost savings)
        - Delete non-current versions after 180 days
        - Remove incomplete multipart uploads after 24 hours

        Args:
            namespace: Object storage namespace.
            bucket_name: Target bucket name.
            rules: List of lifecycle rule dicts with 'name', 'action', and conditions.
        """
        import json

        request = oci.object_storage.models.PutBucketLifecycleRulesDetails(
            lifecycle_rules=[
                oci.object_storage.models.LifecycleRule(**rule) for rule in rules
            ]
        )

        self.storage.put_bucket_lifecycle_rules(namespace, bucket_name, request)
        logger.info("Lifecycle policy applied to bucket: %s", bucket_name)

    def upload_file(
        self,
        namespace: str,
        bucket_name: str,
        object_name: str,
        file_path: str,
        content_type: Optional[str] = None,
    ) -> None:
        """Upload a local file to an Object Storage bucket.

        Args:
            namespace: Object storage namespace.
            bucket_name: Target bucket name.
            object_name: Key for the uploaded object.
            file_path: Path to the local file to upload.
            content_type: MIME type for the uploaded object.
        """
        with open(file_path, "rb") as f:
            self.storage.put_object(
                namespace,
                bucket_name,
                object_name,
                body=f,
                content_type=content_type or "application/octet-stream",
            )
        logger.info("Uploaded %s → %s/%s", file_path, bucket_name, object_name)
```

### Pattern 3: Autonomous Database Connection Setup

```python
import oci
from typing import Optional


def get_autonomous_db_wallet(
    adb_client: oci.database.AutonomousDatabaseClient,
    adb_instance_id: str,
    wallet_password: str = "WalletP@ssw0rd!",
    download_dir: str = "/tmp/wallets",
) -> dict:
    """Download the Oracle Wallet for an Autonomous Database instance.

    The wallet contains the TLS certificates and connection strings needed
    to securely connect to Autonomous Database from Python applications
    using cx_Oracle or oracledb drivers.

    Args:
        adb_client: Authenticated AutonomousDatabaseClient.
        adb_instance_id: OCID of the Autonomous Database instance.
        wallet_password: Password for the downloaded wallet archive.
        download_dir: Directory to save the wallet zip file.

    Returns:
        Dict with wallet download URL and password.
    """
    from oci.exceptions import ServiceError

    try:
        response = adb_client.generate_autonomous_database_wallet(
            autonomous_database_id=adb_instance_id,
            password=wallet_password,
        )

        wallet_data = response.data
        logger.info(
            "Wallet generated for ADW instance %s. Download URL valid for 1 hour.",
            adb_instance_id,
        )

        return {
            "download_url": wallet_data.url,
            "password": wallet_password,
            "expiration_time": str(wallet_data.time_wallet_expired),
        }
    except ServiceError as e:
        logger.error("Failed to generate wallet for %s: %s", adb_instance_id, e)
        raise

# Connection string format for cx_Oracle / oracledb
# conn = oracledb.connect(
#     user="admin",
#     password=wallet_password,
#     dsn=(
#         f"(description=(retry_count=20)(retry_delay=3)"
#         f"(address=(protocol=tcps)(port=1522)"
#         f"(host={hostname}))(connect_data=(service_name={service_name}))"
#         f"(security=(ssl_server_cert_match={hostname})))"
#     )
# )
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


## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Primary Documentation](https://docs.oracle.com/en-us/iaas/home.html)
- [API Reference or Getting Started](https://docs.oracle.com/en-us/iaas/products/compute.htm)
- [Configuration Guide](https://docs.oracle.com/en-us/iaas/Content/Object/Concepts/understandingobjectstorage.htm)
- [Best Practices](https://docs.oracle.com/en-us/iaas/Content/Identity/policies/intro.htm)
- [Common Patterns or Tutorials](https://docs.oracle.com/en-us/iaas/Content/home.htm)