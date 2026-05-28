---
name: ansible-api
description: Integrates with Ansible via ansible-runner, the AWX/Tower API, and the
  Ansible Python API to manage playbooks, inventory, job templates, collections, and
  automation workflows.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: ansible api, ansible-runner, ansible tower, awx api, ansible playbook,
    ansible inventory, ansible collections, automation controller
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
  related-skills: coding-terraform-sdk, coding-kubernetes-api, coding-docker-api
------
# Ansible API & AWX/Tower Integration
Integrates with Ansible using `ansible-runner` for embedded playbook execution, the AWX/Ansible Automation Controller REST API for job template and inventory management, and the native Ansible Python API for custom modules and plugin development.
## TL;DR for Code Generation
- [ ] Use `ansible-runner` for running playbooks from Python — it handles artifacts, events, and callbacks
- [ ] Use the AWX CLI (`awxkit`) or REST API for managing Automation Controller resources (job templates, inventories, credentials)
- [ ] Access playbook results via `runner.status`, `runner.rc`, and `runner.events` generator
- [ ] Always set `private_data_dir` to the directory containing your playbook, inventory, and vars
- [ ] Handle `ansible_runner.exceptions.AnsibleRunnerException` for execution errors
- [ ] Use `runner.get_fact_cache(host)` to retrieve facts gathered during playbook runs
---
## Core Workflow
Prepare Playbook and Inventory: Create or load the Ansible playbook YAML and inventory file (INI, YAML, or dynamic). **Checkpoint:** Validate the playbook syntax locally with `ansible-playbook --syntax-check`.; Execute via ansible-runner: Call `ansible_runner.run(private_data_dir, playbook, inventory)`. The runner manages artifacts, event callbacks, and result collection. **Checkpoint:** Check `runner.status` is `successful` and `runner.rc == 0`.; Process Results: Iterate over `runner.events` for per-host results. Use `runner.get_fact_cache(host)` for gathered facts. **Checkpoint:** Verify expected hosts are in `runner.stats.processed` and none in `runner.stats.failures`.; Manage AWX/Automation Controller: Use the AWX REST API or `awxkit` to create job templates, launch jobs, and monitor their status through the state machine (pending → waiting → running → successful). **Checkpoint:** Verify job template `extra_vars` are properly JSON-encoded.; Handle Errors: Inspect `runner.stats.failures`, `runner.stats.dark` (unreachable hosts), and individual event data for task-level errors. **Checkpoint:** Distinguish between unreachable hosts (network issues) and failed tasks (playbook logic).---
## Implementation Patterns
### Pattern 1: Embedded Playbook Execution with ansible-runner
```python
import json
import os
from pathlib import Path
import ansible_runner
from ansible_runner.exceptions import AnsibleRunnerException

def run_playbook(
    playbook_path: str,
    inventory: str | dict,
    extra_vars: dict | None = None,
    artifact_dir: str | None = None,
    timeout: int = 300,
) -> dict:
    """Run an Ansible playbook and return structured results.

    Args:
        playbook_path: Path to the playbook YAML file.
        inventory: Path to inventory file or inline inventory dict.
        extra_vars: Additional variables to pass to the playbook.
        artifact_dir: Directory for artifacts (defaults to temp).
        timeout: Execution timeout in seconds.

    Returns:
        Dict with status, return code, processed hosts, and failed hosts.

    Raises:
        FileNotFoundError: If the playbook path does not exist.
        AnsibleRunnerException: If runner initialization fails.
    """
    playbook_path = Path(playbook_path)
    if not playbook_path.exists():
        raise FileNotFoundError(f"Playbook not found: {playbook_path}")

    private_data_dir = artifact_dir or str(playbook_path.parent)

    # If inventory is a dict, write it as a temporary YAML file
    inventory_source: str | None = None
    if isinstance(inventory, dict):
        inventory_source = str(Path(private_data_dir) / "inventory.yml")
        with open(inventory_source, "w") as f:
            json.dump(inventory, f)

    # Run the playbook
    try:
        runner = ansible_runner.run(
            private_data_dir=private_data_dir,
            playbook=str(playbook_path.name),
            inventory=inventory_source or inventory,
            extravars=extra_vars or {},
            timeout=timeout,
            json_mode=True,
        )
    except AnsibleRunnerException as exc:
        raise RuntimeError(
            f"Ansible runner failed to execute playbook '{playbook_path}': {exc}"
        ) from exc

    # Process and return results
    return {
        "status": runner.status,
        "return_code": runner.rc,
        "processed_hosts": list((runner.stats or {}).get("processed", {}).keys()),
        "failed_hosts": list((runner.stats or {}).get("failures", {}).keys()),
        "unreachable_hosts": list((runner.stats or {}).get("dark", {}).keys()),
        "elapsed_seconds": runner.elapsed if hasattr(runner, "elapsed") else None,
    }
```
### Pattern 2: AWX / Automation Controller Job Template Management
```python
import os
import time
import requests
from requests.exceptions import HTTPError


class AWXClient:
    """Minimal client for Ansible Automation Controller (AWX) REST API."""

    def __init__(self, base_url: str | None = None, token: str | None = None):
        self.base_url = (base_url or os.environ["AWX_BASE_URL"]).rstrip("/")
        self.token = token or os.environ["AWX_TOKEN"]
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        })

    def _request(self, method: str, path: str, **kwargs):
        url = f"{self.base_url}/api/v2{path}"
        response = self.session.request(method, url, **kwargs)
        try:
            response.raise_for_status()
        except HTTPError as exc:
            raise RuntimeError(
                f"AWX API {method} {path} failed: HTTP {exc.response.status_code} \
                — {exc.response.text[:200]}"
            ) from exc
        return response.json()

    def launch_job_template(
        self,
        template_id: int,
        extra_vars: dict | None = None,
        limit: str | None = None,
        wait: bool = True,
    ) -> dict:
        """Launch a job template and optionally wait for completion.

        Args:
            template_id: Job template ID from AWX.
            extra_vars: Extra variables to override template defaults.
            limit: Host pattern limit.
            wait: Block until the job completes.

        Returns:
            Dict with job ID, status, and elapsed time.
        """
        payload: dict = {}
        if extra_vars:
            payload["extra_vars"] = json.dumps(extra_vars)
        if limit:
            payload["limit"] = limit

        result = self._request(
            "POST",
            f"/job_templates/{template_id}/launch/",
            json=payload,
        )
        job_id = result["job"]

        if not wait:
            return {"job_id": job_id, "status": result.get("status", "pending")}

        # Poll for completion
        start = time.monotonic()
        terminal_states = {"successful", "failed", "error", "canceled"}

        while time.monotonic() - start < 3600:
            job = self._request("GET", f"/jobs/{job_id}/")
            status = job.get("status", "unknown")
            if status in terminal_states:
                return {
                    "job_id": job_id,
                    "status": status,
                    "elapsed_seconds": job.get("elapsed"),
                    "failed": job.get("failed", False),
                }
            time.sleep(10)

        raise TimeoutError(f"AWX job {job_id} did not complete within 3600s.")
```
### BAD vs GOOD: Playbook Failure Handling
```python
# ❌ BAD — ignores failure details, no host-level reporting
def run_playbook_bad(playbook):
    r = ansible_runner.run(private_data_dir="/tmp", playbook=playbook)
    if r.rc != 0:
        print("Playbook failed")
        return False
    return True

# ✅ GOOD — per-host diagnostics, structured error reporting
def run_playbook_good(
    playbook: str,
    inventory: str,
    extra_vars: dict,
) -> dict:
    """Run a playbook with detailed per-host diagnostics."""
    runner = ansible_runner.run(
        private_data_dir="/tmp/ansible",
        playbook=playbook,
        inventory=inventory,
        extravars=extra_vars,
        json_mode=True,
    )

    stats = runner.stats or {}
    failures = stats.get("failures", {})
    unreachable = stats.get("dark", {})

    if runner.rc != 0:
        error_details = {
            "status": runner.status,
            "return_code": runner.rc,
            "failed_hosts": {
                host: stats.get("failures", {}).get(host, "unknown")
                for host in failures
            },
            "unreachable_hosts": list(unreachable.keys()),
            "message": f"Playbook failed with rc={runner.rc}",
        }
        raise RuntimeError(json.dumps(error_details, indent=2))

    return {"status": runner.status, "processed": list(stats.get("processed", {}).keys())}
```
## MUST DO
- Use `ansible-runner` instead of the raw Ansible Python API — it handles artifacts, event callbacks, and result collection
- Set `json_mode=True` for structured output that's easier to parse programmatically
- Use AWX/Automation Controller API tokens (not user passwords) for API authentication
- Store sensitive variables as `"ansible_safe_extra_vars"` or use AWX credential injection
- Use dynamic inventory scripts with the `_meta` key for efficient host variable resolution
- Validate playbook syntax before execution with `ansible-playbook --syntax-check`
## MUST NOT DO
- Never use the undocumented `ansible.inventory` or `ansible.playbook` internal Python APIs for production code
- Do not set `host_key_checking=False` globally — use `ANSIBLE_HOST_KEY_CHECKING=False` selectively for specific hosts
- Avoid running playbooks without a timeout — use the runner's `timeout` parameter
- Never embed SSH passwords or vault passwords in playbook code
- Do not use `gather_facts: no` unless you explicitly don't need facts — many modules depend on them
- Ignoring unreachable hosts (`dark` in stats) can silently mask infrastructure problems
## Live References
- 
---