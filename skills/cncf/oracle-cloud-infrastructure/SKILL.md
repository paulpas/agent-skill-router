---
description: Implements functionalities for Oracle Cloud Infrastructure, covering Compute, Object Storage, and Autonomous Database services.\nlicense: MIT\ncompatibility: opencode\nmetadata:\n  version: "1.0.0"\n  domain: cloud\n  triggers: oracle cloud, compute services, object storage, autonomous database, oracle database, OCI functionalities\n  role: implementation\n  scope: implementation\n  output-format: code\n  related-skills: oracle-cloud-architecture, cloud-best-practices\n  archetypes: tactical, educational\n  anti_triggers: vague terms, insufficient permissions\n  response_profile: high\n---\nname: oracle-cloud-infrastructure
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
---
description: Implements functionalities for Oracle Cloud Infrastructure, covering Compute, Object Storage, and Autonomous Database services.\nlicense: MIT\ncompatibility: opencode\nmetadata:\n  version: "1.0.0"\n  domain: cloud\n  triggers: oracle cloud, compute services, object storage, autonomous database, oracle database, OCI functionalities\n  role: implementation\n  scope: implementation\n  output-format: code\n  related-skills: oracle-cloud-architecture, cloud-best-practices\n  archetypes: tactical, educational\n  anti_triggers: vague terms, insufficient permissions\n  response_profile: high\n---\n# Oracle Cloud Infrastructure
Implements functionalities for Oracle Cloud Infrastructure, covering Compute, Object Storage, and Autonomous Database services.

## TL;DR Checklist
- [ ] Support for Compute resources allocation and management.
- [ ] Reliable Object Storage for unstructured data storage.
- [ ] Autonomous Database capabilities for seamless database management.
- [ ] Excellent security and network functionalities for all services.

## When to Use
- When deploying applications leveraging cloud computing resources.
- For storing unstructured data with high reliability and accessibility needs.
- When looking for automated database management solutions.

## Core Workflow
1. **Provision Compute Instances** — Allocate resources via the OCI console or CLI for application deployment.  
   **Checkpoint:** Ensure instances are running without errors in the OCI dashboard.
2. **Configure Object Storage** — Set up Object Storage buckets for data insertion with appropriate permissions.  
   **Checkpoint:** Verify data accessibility and correct permissions through the storage console.
3. **Deploy Autonomous Database** — Create and configure an Autonomous Database for efficient data manipulation and querying.  
   **Checkpoint:** Validate connectivity and functionality by executing a test query.

## Implementation Patterns
### Compute Services
```python
def provision_compute_instance(instance_type: str, image_id: str) -> str:
    """Provision a new compute instance on Oracle Cloud.

    Args:
        instance_type (str): The type of compute instance to provision.
        image_id (str): The image ID of the operating system to use.

    Returns:
        str: ID of the created compute instance.
    """
    # Example function logic to provision a compute instance
    return "instance-id"
```

### Object Storage
```python
def upload_to_object_storage(bucket_name: str, object_name: str, data: bytes) -> None:
    """Uploads data to the specified bucket in Oracle Object Storage.
    
    Args:
        bucket_name (str): The name of the object storage bucket.
        object_name (str): The name for the stored object.
        data (bytes): The data to upload as a byte stream.
    """
    # Example logic to upload data
    pass  # Actual implementation would go here
```

### Autonomous Database
```python
def create_autonomous_database(db_name: str, cpu_count: int, storage_size: int) -> str:
    """Create an Autonomous Database instance.
    
    Args:
        db_name (str): The name of the database instance.
        cpu_count (int): Number of CPUs to allocate.
        storage_size (int): Size of the storage in GB.
    
    Returns:
        str: ID of the created database instance.
    """
    # Logic to create the autonomous database
    return "db-instance-id"
```

## Constraints
### MUST DO
- Validate compute instance status after provisioning to ensure resource readiness.
- Ensure object storage bucket permissions are correctly set before uploading data.
- Adjust CPU and storage configurations based on application load requirements for databases.

### MUST NOT DO
- Do not hard-code secret keys or credentials; utilize OCI secrets management features.
- Avoid unnecessary storage costs by regularly monitoring and deleting obsolete objects in Object Storage.

## Output Template
1. **Compute provisioning details** — Summary of the provisions made during the compute instance setup.  
2. **Object Storage status** — Confirmation whether uploads were successful or failed.  
3. **Database creation outcomes** — Details of the created Autonomous Database instance and its configuration.

## Related Skills
| Skill | Purpose |
|---|---|
| `oracle-cloud-architecture` | Guidance on optimal OCI architecture practices. |
| `cloud-best-practices` | General best practices for cloud implementations. |