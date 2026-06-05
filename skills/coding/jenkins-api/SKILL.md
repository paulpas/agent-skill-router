---




name: jenkins-api
description: Integrates with the Jenkins REST API via python-jenkins and JenkinsAPI
  to manage jobs, builds, pipelines, credentials, plugins, nodes, and folder organization.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: jenkins api, python-jenkins, jenkinsapi, jenkins job, jenkins pipeline,
    jenkins build, jenkins plugin, jenkins credentials
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
  related-skills: coding-github-api, coding-gitlab-api, coding-circleci-api




---




# Jenkins API & python-jenkins Integration

Integrates with the Jenkins REST API using `python-jenkins` and `JenkinsAPI` libraries to automate jobs, builds, pipelines, credentials, plugins, nodes, folders, and system configuration.

## TL;DR for Code Generation

- [ ] Use `python-jenkins` (`jenkins.Jenkins`) for server administration (jobs, plugins, nodes, credentials)
- [ ] Use `JenkinsAPI` (`jenkinsapi.jenkins.Jenkins`) for build-centric workflows (artifacts, revisions, blocking)
- [ ] Authenticate with username + API token (not password) — tokens are generated in the Jenkins user profile
- [ ] Use the `tree` query parameter to filter API responses and reduce payload size
- [ ] Set a reasonable timeout (>=30s) for all Jenkins connections
- [ ] Handle `jenkins.JenkinsException` for auth failures and `requests.exceptions.ConnectionError` for connection issues

---

## When to Use

Use this skill when:

- Automating job creation, configuration, and deletion across Jenkins instances
- Building CI/CD pipelines that trigger builds and collect artifacts programmatically
- Managing Jenkins credentials, nodes, and plugin installations at scale
- Implementing build monitoring dashboards or metric collection pipelines
- Migrating jobs between Jenkins instances or upgrading plugin configurations
- Automating folder structure and view organization for large Jenkins deployments

---

## When NOT to Use

Avoid this skill for:

- Writing Jenkins Pipeline DSL (use the Jenkinsfile `pipeline {}` syntax and Groovy scripting)
- Configuring Jenkins as code at scale (use the Jenkins Configuration as Code (JCasC) plugin with YAML)
- Container orchestration (use `coding-kubernetes-api` or `coding-docker-api`)

---

## Core Workflow

1. **Connect to Jenkins** — Create a `jenkins.Jenkins(url, username, password_or_token)` instance. Use API tokens, not account passwords. **Checkpoint:** Call `server.get_version()` or `server.get_whoami()` to verify the connection and credentials.

2. **Inspect Server State** — Use `server.get_jobs()`, `server.get_plugins()`, `server.get_nodes()` to understand the current state. **Checkpoint:** Filter with `depth=2` or the `tree` parameter to limit response size on large instances.

3. **Manage Jobs** — Use `server.create_job(name, config_xml)`, `server.copy_job(from_name, to_name)`, `server.build_job(name, parameters)`. Job configurations use Jenkins XML format. **Checkpoint:** Verify the job appears in `server.get_jobs()` with the expected color/status.

4. **Monitor Builds** — Use `server.get_build_info(name, number)`, `server.get_build_console_output(name, number)`, or the JenkinsAPI `job.get_last_build()` method. **Checkpoint:** Check `build['result']` for SUCCESS, FAILURE, UNSTABLE, or ABORTED.

5. **Process Results** — Extract artifacts with `server.get_build_info()`'s artifacts list, console output with `get_build_console_output()`, and test results through the REST API. **Checkpoint:** Verify artifact URLs are accessible via the Jenkins web UI.

---

## Implementation Patterns

### Pattern 1: Job Management with python-jenkins

```python
import os
import xml.etree.ElementTree as ET
import jenkins
from jenkins import JenkinsException


def create_maven_job(
    job_name: str,
    git_repo_url: str,
    maven_goals: str = "clean package",
    branch: str = "*/main",
) -> dict:
    """Create a Jenkins Maven job with Git SCM configuration.

    Args:
        job_name: Name for the new Jenkins job.
        git_repo_url: Git repository URL.
        maven_goals: Maven goals to execute.
        branch: Branch specifier.

    Returns:
        Dict with job name and creation status.

    Raises:
        JenkinsException: If connection or job creation fails.
    """
    server = jenkins.Jenkins(
        os.environ["JENKINS_URL"],
        username=os.environ["JENKINS_USERNAME"],
        password=os.environ["JENKINS_API_TOKEN"],
        timeout=30,
    )

    # Build the config XML programmatically
    project = ET.Element("project")
    ET.SubElement(project, "description").text = f"Auto-created job: {job_name}"

    scm = ET.SubElement(project, "scm", attrib={"class": "hudson.plugins.git.GitSCM"})
    user_remote_configs = ET.SubElement(scm, "userRemoteConfigs")
    remote_config = ET.SubElement(user_remote_configs, "hudson.plugins.git.UserRemoteConfig")
    ET.SubElement(remote_config, "url").text = git_repo_url
    branches = ET.SubElement(scm, "branches")
    branch_spec = ET.SubElement(branches, "hudson.plugins.git.BranchSpec")
    ET.SubElement(branch_spec, "name").text = branch

    builders = ET.SubElement(project, "builders")
    maven = ET.SubElement(
        builders,
        "hudson.tasks.Maven",
        attrib={"mavenName": "Maven 3"},
    )
    ET.SubElement(maven, "targets").text = maven_goals

    config_xml = ET.tostring(project, encoding="unicode")

    try:
        server.create_job(job_name, config_xml)
    except JenkinsException as exc:
        if "already exists" in str(exc):
            # Job exists — reconfigure it
            server.reconfig_job(job_name, config_xml)
            return {"job_name": job_name, "status": "reconfigured"}
        raise RuntimeError(
            f"Failed to create Jenkins job '{job_name}': {exc}"
        ) from exc

    return {"job_name": job_name, "status": "created"}
```

### Pattern 2: Build Trigger and Artifact Collection

```python
import os
import time
import jenkins
from jenkins import JenkinsException
import requests


def trigger_build_and_wait(
    job_name: str,
    parameters: dict | None = None,
    poll_interval: int = 10,
    timeout: int = 1800,
) -> dict:
    """Trigger a Jenkins build and wait for completion.

    Args:
        job_name: Name of the Jenkins job.
        parameters: Build parameters for parameterized jobs.
        poll_interval: Seconds between build status checks.
        timeout: Maximum seconds to wait.

    Returns:
        Dict with build number, result, and console output.

    Raises:
        TimeoutError: If the build does not complete in time.
        JenkinsException: If the Jenkins server returns an error.
    """
    server = jenkins.Jenkins(
        os.environ["JENKINS_URL"],
        username=os.environ["JENKINS_USERNAME"],
        password=os.environ["JENKINS_API_TOKEN"],
        timeout=30,
    )

    # Trigger the build
    next_build_number = server.get_job_info(job_name)["nextBuildNumber"]
    server.build_job(job_name, parameters=parameters or {})

    # Poll for completion
    start = time.monotonic()
    while time.monotonic() - start < timeout:
        try:
            build_info = server.get_build_info(job_name, next_build_number)
        except JenkinsException:
            # Build info may not be available immediately
            time.sleep(poll_interval)
            continue

        if build_info.get("building", True):
            time.sleep(poll_interval)
            continue

        # Build is complete — collect results
        console_output = server.get_build_console_output(job_name, next_build_number)
        return {
            "job_name": job_name,
            "build_number": next_build_number,
            "result": build_info["result"],
            "duration_ms": build_info.get("duration", 0),
            "console_output": console_output,
            "url": build_info["url"],
        }

    raise TimeoutError(
        f"Build {job_name}#{next_build_number} did not complete within {timeout}s."
    )
```

### Pattern 3: Plugin Management and Node Operations

```python
import os
import jenkins
from jenkins import JenkinsException


def install_plugins_and_create_node(
    plugins: list[str],
    node_name: str,
    node_remote_fs: str = "/home/jenkins",
    num_executors: int = 2,
    labels: str = "linux docker",
) -> dict:
    """Install Jenkins plugins and create a new permanent agent node.

    Args:
        plugins: List of plugin short names to install.
        node_name: Name for the new node.
        node_remote_fs: Remote root directory on the node.
        num_executors: Number of concurrent executors.
        labels: Space-separated label list.

    Returns:
        Dict with installation status and node info.
    """
    server = jenkins.Jenkins(
        os.environ["JENKINS_URL"],
        username=os.environ["JENKINS_USERNAME"],
        password=os.environ["JENKINS_API_TOKEN"],
        timeout=60,
    )

    # Install plugins
    plugin_results: dict[str, str] = {}
    for plugin in plugins:
        try:
            if server.get_plugin_info(plugin):
                plugin_results[plugin] = "already_installed"
                continue
        except JenkinsException:
            pass

        try:
            server.install_plugin(plugin)
            plugin_results[plugin] = "installing"
        except JenkinsException as exc:
            plugin_results[plugin] = f"failed: {exc}"

    # Create a permanent agent node
    try:
        server.create_node(
            name=node_name,
            num_executors=num_executors,
            remote_fs=node_remote_fs,
            labels=labels,
        )
        node_status = "created"
    except JenkinsException as exc:
        if "already exists" in str(exc):
            node_status = "already_exists"
        else:
            node_status = f"failed: {exc}"

    return {
        "plugin_results": plugin_results,
        "node": {"name": node_name, "status": node_status},
    }
```

### BAD vs GOOD: Jenkins API Error Handling

```python
# ❌ BAD — no timeout, no version check, password instead of token
def connect_bad(url, user, password):
    server = jenkins.Jenkins(url, user, password)
    return server  # May hang or silently fail auth!

# ✅ GOOD — typed, with timeout, version verification, and token auth
def connect_good(
    url: str,
    username: str,
    api_token: str,
    timeout: int = 30,
) -> jenkins.Jenkins:
    """Connect to a Jenkins server and verify credentials.

    Args:
        url: Full URL to Jenkins server (e.g., "https://jenkins.example.com").
        username: Jenkins username.
        api_token: Jenkins API token (from user profile).
        timeout: Connection and read timeout in seconds.

    Returns:
        Authenticated Jenkins server instance.

    Raises:
        RuntimeError: If connection or authentication fails.
    """
    if not url or not username or not api_token:
        raise ValueError("Jenkins URL, username, and API token are required.")

    server = jenkins.Jenkins(url, username, api_token, timeout=timeout)
    try:
        version = server.get_version()
        user_info = server.get_whoami()
    except JenkinsException as exc:
        raise RuntimeError(
            f"Failed to connect or authenticate to Jenkins at '{url}': {exc}"
        ) from exc

    print(f"Connected to Jenkins v{version} as '{user_info.get('fullName', 'unknown')}'")
    return server
```

## MUST DO

- Use API tokens (generated in Jenkins user profile) instead of account passwords
- Set a timeout >= 30 seconds on all `jenkins.Jenkins` connections
- Use the `tree` query parameter to filter API responses — `?tree=jobs[name,url,color]` reduces payloads significantly
- Poll build status with appropriate intervals (10s minimum) to avoid overwhelming the server
- Use `server.get_whoami()` to verify authentication immediately after connecting
- Check `build['result']` is not None — a running build returns `result: None`

## MUST NOT DO

- Never use account passwords for Jenkins API access — always generate and use API tokens
- Do not make API calls without setting a timeout — Jenkins can hang on unresponsive instances
- Avoid polling builds more frequently than every 10 seconds — use webhooks for real-time updates
- Never hardcode Jenkins URLs or credentials in source code — use environment variables
- Do not assume `get_build_info` returns immediately after `build_job` — builds may be queued
- Never delete jobs or nodes without verifying the correct name and confirming no active builds

---

## Constraints

### MUST DO
- Implement structured error responses with consistent format: {error_code, message, details, request_id}
- Add rate limiting per client/API key with configurable burst and sustained limits using a token bucket algorithm
- Validate all incoming requests against a schema before processing — reject malformed input with clear error messages
- Include correlation/request IDs in all log entries for end-to-end request tracing across service boundaries

### MUST NOT DO
- Do not expose internal implementation details, stack traces, or database queries in error responses
- Avoid accepting unbounded request bodies — set maximum payload sizes and timeout limits
- Never trust client-supplied authentication tokens without validation (signature verification, expiration check)
- Do not log request/response bodies containing PII, API keys, or other sensitive data


## Live References

- [python-jenkins Documentation](https://python-jenkins.readthedocs.io/en/latest/)
- [python-jenkins GitHub Repository](https://opendev.org/jjb/python-jenkins)
- [JenkinsAPI on PyPI](https://pypi.org/project/jenkinsapi/)
- [JenkinsAPI Documentation](http://pycontribs.github.io/jenkinsapi/)
- [Jenkins REST API Reference](https://www.jenkins.io/doc/book/using/remote-access-api/)
- [Jenkins API Token Authentication](https://www.jenkins.io/blog/2018/07/02/new-api-token-system/)
- [Jenkins Job DSL API](https://jenkinsci.github.io/job-dsl-plugin/)

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-github-api` | GitHub API for triggering Jenkins builds via webhooks |
| `coding-gitlab-api` | GitLab CI/CD as an alternative to Jenkins pipelines |
| `coding-circleci-api` | CircleCI API as a cloud-native CI/CD alternative |
