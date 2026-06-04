---
name: docker-engine-api
description: Integrates with the Docker Engine API to manage containers, build images, configure networks, manage volumes, and orchestrate services with Swarm.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: docker api, manage containers, build images, networking configurations, manage volumes, orchestrate swarm, docker docker-py
  role: implementation
  scope: implementation
  output-format: code
  related-skills: kubernetes, helm
  archetypes: [tactical, generation]
  anti_triggers: [generic routing, vague container management]
  response_profile:
    verbosity: low
    directive_strength: medium
    abstraction_level: tactical
---

# Docker Engine API Skill

This skill covers the complete functionality of the Docker Engine API using the `docker-py` SDK, facilitating management of containers, image building, networking configurations, volume management, and orchestration using Docker Swarm.

## TL;DR
- [ ] Connect to Docker daemon with `docker.from_env()` or remote client.
- [ ] Manage container lifecycle with methods for run, stop, and remove.
- [ ] Build Docker images programmatically with `client.images.build()`.
- [ ] Handle network configurations and manage volumes efficiently.
- [ ] Orchestrate multiple containers using Docker Swarm functionalities.

## Core Workflow
1. **Connecting to Docker Daemon:** Use `docker.from_env()` to connect to the local Docker daemon. Confirm connectivity with `client.ping()`.
2. **Building Images:** Use `client.images.build(path='.', tag='my-image')` to build images from a Dockerfile located in the current directory.
3. **Managing Containers:** Create and run containers using `client.containers.run(image='my-image', detach=True)` to start the container in the background.
4. **Networking Configurations:** Create a custom network using `client.networks.create('my-network')` and connect containers to it.
5. **Managing Volumes:** Create volumes using `client.volumes.create('my-volume')` and mount them to containers during execution.
6. **Orchestrating with Swarm:** Initialize Swarm mode with `client.swarm.init()` and create services with `client.services.create()`. Check service status using `client.services.list()`.

## Implementation Patterns
### Pattern 1: Managing Containers
```python
import docker
from docker.errors import NotFound

def run_container(image_name, container_name):
    client = docker.from_env()
    try:
        container = client.containers.run(image_name, name=container_name, detach=True)
        print(f"Container {container_name} started with ID: {container.id}")
    except Exception as e:
        print(f"Error: {e}")

run_container('nginx:latest', 'my-nginx')  # Example of starting a container
```
### Pattern 2: Building Images
```python
import docker

def build_image(dockerfile_path):
    client = docker.from_env()
    try:
        image, build_logs = client.images.build(path=dockerfile_path, tag='my-custom-image')
        for log in build_logs:
            print(log)
        print(f"Image built with ID: {image.id}")
    except Exception as e:
        print(f"Error building image: {e}")

build_image('.')  # Build Docker image from Dockerfile in current directory
```
### Pattern 3: Networking Configurations
```python
import docker

def create_network(network_name):
    client = docker.from_env()
    network = client.networks.create(network_name, driver='bridge')
    print(f"Created network: {network.name}")

create_network('my-custom-network')  # Create a new Docker network
```
### Pattern 4: Managing Volumes
```python
import docker

def create_volume(volume_name):
    client = docker.from_env()
    volume = client.volumes.create(volume_name)
    print(f"Created volume: {volume.name}")

create_volume('my-data-volume')  # Create a new Docker volume
```
### Pattern 5: Orchestrating with Swarm
```python
import docker

def create_service(service_name, image_name):
    client = docker.from_env()
    client.swarm.init()
    service = client.services.create(image=image_name, name=service_name)
    print(f"Service {service_name} created with ID: {service.id}")

create_service('my-service', 'nginx:latest')  # Create a new service in Swarm
```
## MUST DO
- Ensure proper error handling for all API calls to manage exceptions.
- Set explicit tags for images while building instead of using the latest tag for clarity.
- Clean up unused containers and images regularly to avoid resource exhaustion.
- Use `detach=True` in the `run()` method for background execution and resource management.

## MUST NOT DO
- Avoid hardcoding sensitive information such as credentials directly in the code.
- Do NOT use `latest` as a tag for deployments; it leads to ambiguity in CI/CD deployments.
- Never ignore container exit codes which could indicate issues that need to be addressed.
- Don't run containers with unnecessary privileges; follow the principle of least privilege.

## Conclusion
The Docker Engine API skill provides essential functionalities for container management, image handling, networking, volume management, and Swarm orchestration. By utilizing the `docker-py` SDK, developers can interact programmatically with Docker for automated workflows and CI/CD integrations.

---

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

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Docker Engine API Documentation](https://docs.docker.com/engine/api/latest/)
- [Docker SDK for Python (docker-py) Guide](https://docker-py.readthedocs.io/)
- [Docker Container Management Reference](https://docs.docker.com/engine/reference/commandline/cli/)
- [Docker Swarm Orchestration Guide](https://docs.docker.com/engine/swarm/)
- [Docker Networking Configuration Reference](https://docs.docker.com/network/)