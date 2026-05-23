---
name: kubernetes-api
description: Integrates with the Kubernetes API via the official client-python SDK
  to manage pods, deployments, services, ConfigMaps, Secrets, CRDs, and cluster resources
  programmatically.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: kubernetes api, k8s python client, client-python, kubectl python, kubernetes
    pods, kubernetes deployments, k8s custom resources, kubernetes operations
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
  related-skills: coding-docker-api, coding-terraform-sdk, coding-ansible-api
------

# Kubernetes API & client-python Integration

Integrates with the Kubernetes API using the official `kubernetes` Python client (`client-python`) to manage pods, deployments, services, ConfigMaps, Secrets, ingress, Custom Resource Definitions (CRDs), and cluster-wide resources. Supports both in-cluster and kubeconfig-based authentication.

## TL;DR for Code Generation

- [ ] Use `config.load_kube_config()` for local development and `config.load_incluster_config()` for in-cluster pods
- [ ] Always use the `V1` API classes (`CoreV1Api`, `AppsV1Api`) which correspond to stable Kubernetes APIs
- [ ] Handle `ApiException` with specific HTTP status codes (401=unauthorized, 403=RBAC denied, 404=not found, 409=conflict)
- [ ] Use the `stream()` wrapper for exec and attach operations inside pods
- [ ] Set `_request_timeout` on API calls to prevent hanging connections
- [ ] Use Kubernetes watches via the `watch.Watch()` utility for event-driven patterns
- [ ] Apply resource manifests using the dynamic client for CRD types not in the generated API

