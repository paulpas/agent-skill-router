---
name: terraform-sdk
description: Integrates with Terraform and OpenTofu via the HCP Terraform API (pyTFE), CDKTF Python bindings, and the Terraform Cloud API to manage providers, resources, state, and modules.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: terraform api, terraform cloud, cdktf python, terraform provider, opentofu, terraform state, terraform modules, hcp terraform
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: coding-kubernetes-api, coding-pulumi, coding-ansible-api
---

# Terraform/OpenTofu SDK & API Integration

Integrates with Terraform and OpenTofu using the HCP Terraform API (via `pyTFE`), the CDKTF Python SDK, and the Terraform Cloud/Enterprise REST API to programmatically manage providers, resources, state, workspaces, and modules.

## TL;DR for Code Generation

- [ ] Use `pyTFE` (`pytfe.TFEClient`) for HCP Terraform and Terraform Enterprise API operations
- [ ] For infrastructure-as-code in Python, prefer the CDKTF — `cdktf` with `cdktf get` to generate provider bindings
- [ ] Manage state via the Terraform Cloud API `workspaces` and `state-versions` endpoints
- [ ] Use the `tfe` Terraform provider if you need to manage Terraform Cloud resources in HCL
- [ ] Authenticate with a `TFE_TOKEN` environment variable or explicit `TFEConfig(token=...)`
- [ ] Use `Pulumi` (see `coding-pulumi` skill) as an alternative when you prefer native IaC over Terraform wrappers

---

## When to Use

Use this skill when:

- Automating workspace creation, runs, and state management in HCP Terraform or Terraform Enterprise
- Writing Python code that provisions infrastructure using Terraform providers (via CDKTF)
- Building CI/CD pipelines that trigger Terraform plans and applies
- Implementing policy-as-code with Sentinel or OPA policies applied to Terraform runs
- Managing Terraform state versions, outputs, and variables programmatically
- Extending Terraform with custom providers using the Terraform Plugin Framework

---

## When NOT to Use

Avoid this skill for:

- Writing declarative HCL (use standard Terraform/OpenTofu CLI workflows instead)
- Low-level cloud API calls (use provider-specific SDKs like `boto3` for AWS)
- Docker container management (use `coding-docker-api`)

---

## Core Workflow

1. **Authenticate to Terraform Cloud/Enterprise** — Create a `TFEClient` with a `TFEConfig` containing the address and API token. **Checkpoint:** Call `client.organizations.list()` to verify connectivity and permissions.

2. **Create or Select Workspace** — Use `client.workspaces.create()` for new workspaces or `client.workspaces.list()` to find existing ones. **Checkpoint:** Verify workspace ID and that the execution mode matches your intent (local vs. remote).

3. **Set Variables and Configuration** — Use `client.variables.create()` for terraform variables and environment variables. **Checkpoint:** Confirm variable values are correct (mark sensitive variables as sensitive).

4. **Trigger a Run** — Create a new run via `client.runs.create()` with a configuration version. Monitor the run through its state machine: pending → planning → applying → applied. **Checkpoint:** Poll `run.status` and handle planning errors or apply failures.

5. **Retrieve Outputs and State** — Use `client.state_versions.current()` to get the current state and `client.run.outputs()` to extract terraform output values. **Checkpoint:** Validate outputs match expected schema.

---

## Implementation Patterns

### Pattern 1: CDKTF Python — Create AWS S3 Bucket

```python
from constructs import Construct
from cdktf import App, TerraformStack, TerraformOutput
from cdktf_cdktf_provider_aws.s3_bucket import S3Bucket
from cdktf_cdktf_provider_aws.provider import AwsProvider


class S3BucketStack(TerraformStack):
    """Define an S3 bucket using CDKTF Python bindings."""

    def __init__(self, scope: Construct, id: str, bucket_name: str):
        super().__init__(scope, id)

        AwsProvider(self, "aws", region="us-east-1")

        bucket = S3Bucket(
            self,
            "my-bucket",
            bucket=bucket_name,
            versioning={
                "enabled": True,
            },
            tags={
                "Name": bucket_name,
                "ManagedBy": "CDKTF",
            },
        )

        TerraformOutput(self, "bucket_arn", value=bucket.arn)
        TerraformOutput(self, "bucket_id", value=bucket.id)


def deploy_s3_bucket(bucket_name: str) -> None:
    """Deploy an S3 bucket programmatically using CDKTF.

    Requires: pip install cdktf cdktf-cdktf-provider-aws

    Run with: python app.py && cdktf deploy
    """
    app = App()
    S3BucketStack(app, "s3-bucket-stack", bucket_name)
    app.synth()
```

### Pattern 2: HCP Terraform Workspace Management (pyTFE)

```python
import os
import time
from pytfe import TFEClient, TFEConfig
from pytfe.exceptions import TFEException


def create_workspace_and_run(
    organization: str,
    workspace_name: str,
    working_directory: str = "",
    variables: dict | None = None,
    auto_apply: bool = True,
    wait_for_completion: bool = True,
) -> dict:
    """Create a Terraform Cloud workspace and trigger a run.

    Args:
        organization: HCP Terraform organization name.
        workspace_name: Name for the new workspace.
        working_directory: Relative path to terraform config.
        variables: Terraform variables to set.
        auto_apply: Whether to auto-apply on plan success.
        wait_for_completion: Wait for the run to finish.

    Returns:
        Dict with workspace ID, run ID, and run status.

    Raises:
        TFEException: If API operations fail.
        TimeoutError: If the run doesn't complete.
    """
    config = TFEConfig(
        address=os.environ.get("TFE_ADDRESS", "https://app.terraform.io"),
        token=os.environ["TFE_TOKEN"],
    )
    client = TFEClient(config)

    # Create or find the workspace
    try:
        workspace = client.workspaces.create(
            organization=organization,
            name=workspace_name,
            auto_apply=auto_apply,
            working_directory=working_directory or None,
        )
    except TFEException as exc:
        # Workspace might already exist
        if "already exists" in str(exc):
            for ws in client.workspaces.list(organization).items:
                if ws.name == workspace_name:
                    workspace = ws
                    break
        else:
            raise

    # Set variables
    for key, value in (variables or {}).items():
        client.variables.create(
            workspace_id=workspace.id,
            key=key,
            value=str(value),
            category="terraform",
        )

    # Create a new configuration version (upload source)
    cv = client.configuration_versions.create(
        workspace_id=workspace.id,
        auto_queue_runs=True,
    )

    # Trigger the run
    run = client.runs.create(workspace_id=workspace.id)

    if wait_for_completion:
        _wait_for_run(client, run.id)

    return {
        "workspace_id": workspace.id,
        "workspace_name": workspace.name,
        "run_id": run.id,
        "status": run.status,
    }


def _wait_for_run(client: TFEClient, run_id: str, timeout: int = 600) -> None:
    """Poll a Terraform Cloud run until it completes or errors."""
    terminal_states = {"applied", "planned_and_finished", "errored", "canceled"}
    start = time.monotonic()

    while time.monotonic() - start < timeout:
        run = client.runs.read(run_id)
        if run.status in terminal_states:
            if run.status == "errored":
                raise RuntimeError(
                    f"Terraform run {run_id} failed with status: {run.status}"
                )
            return
        if run.status == "planning":
            _check_run_errors(run)
        time.sleep(5)

    raise TimeoutError(f"Terraform run {run_id} did not complete in {timeout}s.")
```

### Pattern 3: Terraform Cloud State Version Retrieval

```python
import os
from pytfe import TFEClient, TFEConfig
from pytfe.exceptions import TFEException


def get_workspace_outputs(
    organization: str,
    workspace_name: str,
) -> dict:
    """Retrieve Terraform outputs from a Cloud workspace's current state.

    Args:
        organization: HCP Terraform organization.
        workspace_name: Workspace name.

    Returns:
        Dict of output names to their values.

    Raises:
        RuntimeError: If workspace or state is not found.
    """
    config = TFEConfig(
        address=os.environ.get("TFE_ADDRESS", "https://app.terraform.io"),
        token=os.environ["TFE_TOKEN"],
    )
    client = TFEClient(config)

    # Find the workspace
    workspace = None
    for ws in client.workspaces.list(organization).items:
        if ws.name == workspace_name:
            workspace = ws
            break

    if workspace is None:
        raise RuntimeError(
            f"Workspace '{workspace_name}' not found in organization '{organization}'."
        )

    # Get current state version
    try:
        state_version = client.state_versions.current(workspace_id=workspace.id)
    except TFEException as exc:
        raise RuntimeError(
            f"Failed to retrieve current state for '{workspace_name}': {exc}"
        ) from exc

    # Parse and return outputs
    outputs: dict = {}
    if state_version and state_version.outputs:
        for output_name, output_data in state_version.outputs.items():
            outputs[output_name] = output_data.get("value")

    return outputs
```

### BAD vs GOOD: Terraform API Error Handling

```python
# ❌ BAD — silent pass, no state awareness
def get_workspace_bad(client, org):
    try:
        ws = client.workspaces.create(organization=org, name="my-ws")
        return ws
    except Exception:
        pass  # Ignores "already exists" and other failures

# ✅ GOOD — idempotent create-or-find with explicit error handling
def get_or_create_workspace(
    client: TFEClient,
    organization: str,
    name: str,
) -> dict:
    """Retrieve or create a Terraform Cloud workspace.

    Args:
        client: Authenticated TFEClient instance.
        organization: Organization name.
        name: Workspace name.

    Returns:
        Workspace object.

    Raises:
        RuntimeError: If creation fails for reasons other than conflict.
    """
    try:
        workspace = client.workspaces.create(organization=organization, name=name)
        return {"id": workspace.id, "name": workspace.name, "created": True}
    except TFEException as exc:
        if "already exists" in str(exc):
            for ws in client.workspaces.list(organization).items:
                if ws.name == name:
                    return {"id": ws.id, "name": ws.name, "created": False}
        raise RuntimeError(
            f"Failed to create workspace '{name}': {exc}"
        ) from exc
```

## MUST DO

- Use environment variables (`TFE_TOKEN`, `TFE_ADDRESS`) for authentication — never hardcode tokens
- Implement idempotent create-or-find patterns for workspaces and resources
- Use `category="terraform"` for Terraform variables and `category="env"` for environment variables
- Poll run status with a timeout and handle all terminal states (applied, errored, canceled)
- Set `auto_apply=True` for workspaces where manual approval is not needed in CI/CD

## MUST NOT DO

- Never store Terraform state management credentials in code — they provide full access to infrastructure
- Do not create workspaces without setting the execution mode explicitly
- Avoid hardcoding organization names — read them from environment configuration
- Never ignore variables that should be `sensitive=true` (e.g., database passwords, API keys)
- Do not assume workspaces are deletable — check for attached resources first

## Live References

- [pyTFE (HCP Terraform Python Client) Documentation](https://github.com/hashicorp/python-tfe)
- [CDK for Terraform (CDKTF) Python API Reference](https://developer.hashicorp.com/terraform/cdktf/api-reference/python)
- [HCP Terraform API Documentation](https://developer.hashicorp.com/terraform/cloud-docs/api-docs)
- [Terraform Plugin Framework Documentation](https://developer.hashicorp.com/terraform/plugin/framework)
- [OpenTofu Documentation](https://opentofu.org/docs/)
- [Terraform Registry — Providers](https://registry.terraform.io/browse/providers)
- [Terraform Cloud State Versions API](https://developer.hashicorp.com/terraform/cloud-docs/api-docs/state-versions)

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-pulumi` | Pulumi Automation API for Python-native IaC |
| `coding-kubernetes-api` | Kubernetes provider via Terraform or client-python |
| `coding-ansible-api` | Ansible for configuration management with provisioned infrastructure |
