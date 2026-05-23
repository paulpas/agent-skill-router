---
name: docker-api
description: Integrates with the Docker Engine API via the docker-py SDK to manage containers, images, networks, volumes, and Swarm clusters from Python applications.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: docker api, docker-py, docker sdk python, docker engine api, container management, docker swarm, manage docker containers, docker compose
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: coding-kubernetes-api, coding-github-api, coding-ansible-api
---

# Docker Engine API & docker-py Integration

Integrates with the Docker Engine API via the official `docker-py` Python SDK to programmatically manage containers, images, networks, volumes, and Swarm clusters. Enables building container management tooling, CI/CD orchestration, and infrastructure automation.

## TL;DR for Code Generation

- [ ] Connect with `docker.from_env()` to use the default socket or `docker.DockerClient(base_url='tcp://...')` for remote
- [ ] Use `client.containers.run()` with `detach=True` for background execution
- [ ] Always specify `auto_remove=True` for ephemeral containers to prevent resource leaks
- [ ] Handle `docker.errors.APIError` with specific status codes for robust error recovery
- [ ] Use `client.images.build()` with `rm=True` to clean up intermediate build containers
- [ ] Set `DOCKER_API_VERSION` explicitly to pin a specific API version for compatibility

---

## When to Use

Use this skill when:

- Building custom container orchestration tools or CLI wrappers around Docker
- Automating image builds, tagging, and pushes to container registries
- Managing multi-container environments for development or testing
- Implementing Swarm service deployment and scaling logic
- Building container health-check and log collection pipelines
- Creating ephemeral build or test environments per CI job

---

## When NOT to Use

Avoid this skill for:

- Production Kubernetes orchestration (use the `coding-kubernetes-api` skill)
- Declarative infrastructure-as-code (use `coding-terraform-sdk` or `docker compose`)
- Low-level HTTP calls to the Engine API (the SDK handles serialization and auth)

---

## Core Workflow

1. **Connect to Docker Daemon** — Use `docker.from_env()` for local socket (Unix) or `DockerClient(base_url)` for TCP/TLS. **Checkpoint:** Call `client.ping()` to verify the daemon is reachable and responsive.

2. **Pull or Build Image** — Use `client.images.pull(repository, tag)` or `client.images.build(path=...)`. **Checkpoint:** Verify the image ID is present in `client.images.list(name=...)`.

3. **Create and Run Container** — Use `client.containers.run(image, command, detach=True, ...)` or create the container separately then call `.start()`. **Checkpoint:** Inspect `container.status` to confirm it is `running` or `exited` with the expected exit code.

4. **Manage Container Lifecycle** — Call `.stop()`, `.restart()`, `.kill()`, and `.remove()` with appropriate timeouts. **Checkpoint:** Verify `container.status` transitions to `exited` or the container is removed from `client.containers.list(all=True)`.

5. **Stream Logs and Collect Results** — Use `container.logs(stream=True)` for real-time output and `container.wait()` to block on exit. **Checkpoint:** Check exit code via `container.attrs['State']['ExitCode']`.

---

## Implementation Patterns

### Pattern 1: Build and Push a Docker Image

```python
import os
import docker
from docker.errors import APIError, BuildError

def build_and_push_image(
    path: str,
    image_name: str,
    tag: str = "latest",
    dockerfile: str = "Dockerfile",
    build_args: dict | None = None,
) -> dict:
    """Build a Docker image and push it to a registry.

    Args:
        path: Build context directory.
        image_name: Repository name (e.g., "my-registry.com/my-app").
        tag: Image tag.
        dockerfile: Relative path to Dockerfile within context.
        build_args: Build-time variables for ARG instructions.

    Returns:
        Dict with image ID, tags, and build log.

    Raises:
        BuildError: If the image build fails.
        APIError: If the push to registry fails.
    """
    client = docker.from_env()

    # Build the image
    image, build_logs = client.images.build(
        path=path,
        tag=f"{image_name}:{tag}",
        dockerfile=dockerfile,
        buildargs=build_args or {},
        rm=True,
        forcerm=True,
    )

    log_output = ""
    for chunk in build_logs:
        if "stream" in chunk:
            log_output += chunk["stream"]

    # Tag with additional tags if needed
    image.tag(image_name, tag)

    # Push to registry
    push_log = client.images.push(image_name, tag=tag)
    push_status = push_log.get("status", "unknown")

    return {
        "image_id": image.id,
        "tags": image.tags,
        "build_log": log_output,
        "push_status": push_status,
    }
```

### Pattern 2: Orchestrated Container Execution with Log Streaming

```python
import sys
import docker
from docker.errors import APIError, ContainerError


def run_container_with_streaming(
    image: str,
    command: str | list[str],
    name: str | None = None,
    environment: dict | None = None,
    volumes: dict | None = None,
    network: str | None = None,
    timeout: int = 300,
) -> tuple[int, str]:
    """Run a container with real-time log streaming and timeout.

    Args:
        image: Docker image to use.
        command: Command or entrypoint override.
        name: Container name.
        environment: Environment variables dict.
        volumes: Volume bindings dict (e.g., {"/host/path": {"bind": "/container/path", "mode": "rw"}}).
        network: Network to attach the container to.
        timeout: Maximum runtime in seconds.

    Returns:
        Tuple of (exit_code, full_log_output).

    Raises:
        ContainerError: If the container exits with non-zero code.
        APIError: If Docker API operations fail.
    """
    client = docker.from_env()

    container = client.containers.run(
        image=image,
        command=command,
        name=name,
        environment=environment,
        volumes=volumes,
        network=network,
        detach=True,
        auto_remove=False,  # Keep for log retrieval
    )

    # Stream logs in real-time
    full_log: list[str] = []
    try:
        for log_line in container.logs(stream=True, follow=True):
            decoded = log_line.decode("utf-8", errors="replace").rstrip()
            full_log.append(decoded)
            sys.stdout.write(f"{decoded}\n")
    except KeyboardInterrupt:
        container.stop()
        raise

    # Wait for container to finish
    result = container.wait(timeout=timeout)
    exit_code = result.get("StatusCode", -1)

    # Clean up
    container.remove()

    return exit_code, "\n".join(full_log)
```

### Pattern 3: Swarm Service Management

```python
import docker
from docker.errors import APIError
from docker.types.services import ServiceMode, Resources, RestartPolicy


def create_swarm_service(
    service_name: str,
    image: str,
    replicas: int = 3,
    env_vars: dict | None = None,
    publish_port: tuple[int, int] | None = None,
) -> dict:
    """Create or update a Docker Swarm service.

    Args:
        service_name: Name for the service.
        image: Docker image with tag.
        replicas: Desired number of replicas.
        env_vars: Environment variables for the service.
        publish_port: (host_port, container_port) tuple.

    Returns:
        Dict with service ID, mode, and replica count.
    """
    client = docker.from_env()

    # Ensure we're in Swarm mode
    try:
        client.swarm.reload()
    except APIError:
        client.swarm.init()

    env_list = [f"{k}={v}" for k, v in (env_vars or {}).items()]

    service_kwargs = {
        "name": service_name,
        "image": image,
        "env": env_list,
        "mode": ServiceMode("replicated", replicas=replicas),
        "restart_policy": RestartPolicy(
            condition="any",
            max_attempts=3,
        ),
        "resources": Resources(
            cpu_limit=0.5,
            mem_limit="256M",
            cpu_reservation=0.25,
            mem_reservation="128M",
        ),
    }

    if publish_port:
        host_port, container_port = publish_port
        service_kwargs["endpoint_spec"] = docker.types.EndpointSpec(
            mode="vip",
            ports={container_port: host_port},
        )

    try:
        service = client.services.create(**service_kwargs)
    except APIError as exc:
        raise RuntimeError(
            f"Failed to create Swarm service '{service_name}': {exc}"
        ) from exc

    return {
        "service_id": service.id,
        "name": service.name,
        "mode": "replicated",
        "replicas": replicas,
        "image": image,
    }
```

### BAD vs GOOD: Container Cleanup

```python
# ❌ BAD — containers and images pile up, no cleanup
def run_bad(image):
    client = docker.from_env()
    container = client.containers.run(image, detach=True)
    # Never removed — resource leak!

# ✅ GOOD — always clean up with auto_remove and finally blocks
def run_good(image: str, command: str) -> str:
    """Run a command in a container and return output.

    Ensures the container is removed even if an error occurs.
    """
    client = docker.from_env()
    container = None
    try:
        container = client.containers.run(
            image=image,
            command=command,
            detach=False,
            remove=True,  # Auto-remove after exit
        )
        return container.decode("utf-8")
    except APIError as exc:
        raise RuntimeError(
            f"Container execution failed for image '{image}': {exc}"
        ) from exc
```

## MUST DO

- Use `docker.from_env()` for local socket connections — it reads the `DOCKER_HOST` and `DOCKER_API_VERSION` environment variables
- Always set `remove=True` or `auto_remove=True` for ephemeral containers to prevent resource leaks
- Use `client.containers.list(all=True, filters={})` with filters to avoid fetching all containers
- Pin image tags explicitly (e.g., `python:3.12-slim`) rather than using `latest`
- Use `forcerm=True` when building images to remove intermediate containers immediately
- Handle `docker.errors.DockerException` (connection errors) separately from `APIError` (API-level errors)

## MUST NOT DO

- Never run containers with `privileged=True` unless absolutely necessary — it's a security risk
- Do not use the `docker-py` library to control a remote Docker daemon over an unencrypted TCP socket
- Avoid using `auto_remove=False` for long-running containers that need cleanup
- Never ignore `BuildError` when building images — the build log contains essential diagnostics
- Do not hardcode registry credentials in build or push code — use credential helpers or environment variables

## Live References

- [docker-py Documentation](https://docker-py.readthedocs.io/en/stable/)
- [docker-py GitHub Repository](https://github.com/docker/docker-py)
- [Docker Engine API Reference](https://docs.docker.com/reference/api/engine/)
- [Docker SDK for Python — Containers](https://docker-py.readthedocs.io/en/stable/containers.html)
- [Docker SDK for Python — Swarm Services](https://docker-py.readthedocs.io/en/stable/services.html)
- [Dockerfile Reference](https://docs.docker.com/reference/dockerfile/)
- [Docker Engine API Version Matrix](https://docs.docker.com/reference/api/engine/#api-version-matrix)

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-kubernetes-api` | Kubernetes orchestration with client-python |
| `coding-github-api` | GitHub Actions container build and publish workflows |
| `coding-ansible-api` | Ansible container management with docker_container module |
