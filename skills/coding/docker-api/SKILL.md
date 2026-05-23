---
name: docker-api
description: Integrates with the Docker Engine API via the docker-py SDK to manage
  containers, images, networks, volumes, and Swarm clusters from Python applications.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: docker api, docker-py, docker sdk python, docker engine api, container
    management, docker swarm, manage docker containers, docker compose
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
  related-skills: coding-kubernetes-api, coding-github-api, coding-ansible-api
------

# Docker Engine API & docker-py Integration

Integrates with the Docker Engine API via the official `docker-py` Python SDK to programmatically manage containers, images, networks, volumes, and Swarm clusters. Enables building container management tooling, CI/CD orchestration, and infrastructure automation.

## TL;DR for Code Generation

- [ ] Connect with `docker.from_env()` to use the default socket or `docker.DockerClient(base_url='tcp://...')` for remote
- [ ] Use `client.containers.run()` with `detach=True` for background execution
- [ ] Always specify `auto_remove=True` for ephemeral containers to prevent resource leaks
- [ ] Handle `docker.errors.APIError` with specific status codes for robust error recovery
- [ ] Use `client.images.build()` with `rm=True` to clean up intermediate build containers
- [ ] Set `DOCKER_API_VERSION` explicitly to pin a specific API version for compatibility

