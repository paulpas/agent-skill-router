---




name: kubernetes-api
description: Integrates with the Kubernetes API via the official client-python SDK
  to manage pods, deployments, services, ConfigMaps, Secrets, CRDs, and cluster resources
  programmatically.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
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




---




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

---

## When to Use

Use this skill when:

- Automating deployment rollouts, rollbacks, and canary releases
- Building internal developer platforms or self-service namespace provisioning
- Implementing custom operators or controllers for Kubernetes CRDs
- Collecting pod logs, cluster metrics, or resource utilization data
- Managing ConfigMaps, Secrets, and RBAC resources programmatically
- Building CI/CD pipelines that deploy to Kubernetes clusters

---

## When NOT to Use

Avoid this skill for:

- Declarative infrastructure-as-code (use `coding-terraform-sdk` or `Pulumi` with the Kubernetes provider)
- Low-level HTTP REST calls (the client handles serialization, auth, and API version negotiation)
- Docker container operations on individual nodes (use `coding-docker-api` for the Docker Engine)

---

## Core Workflow

1. **Configure Kubernetes Client** — Load configuration with `config.load_kube_config()` (kubectl config) or `config.load_incluster_config()` (in-cluster ServiceAccount). **Checkpoint:** Call `CoreV1Api().get_api_resources()` to verify the connection and API server version.

2. **Choose the Right API Group** — Use `CoreV1Api` for pods, services, configmaps, secrets, namespaces; `AppsV1Api` for deployments, statefulsets, daemonsets; `BatchV1Api` for jobs and cronjobs; `CustomObjectsApi` for CRDs. **Checkpoint:** Verify resource version via `api_client.call_api()` introspection.

3. **Create or Update Resources** — Use the `create_namespaced_*`, `patch_namespaced_*`, or `replace_namespaced_*` methods. Prefer `patch_` for partial updates. **Checkpoint:** Confirm `metadata.uid` and `metadata.resourceVersion` on the returned object.

4. **Watch for Resource Changes** — Use `watch.Watch().stream()` to receive a stream of events (ADDED, MODIFIED, DELETED). **Checkpoint:** Set `_request_timeout` on the watch to detect stale connections.

5. **Handle Errors and Cleanup** — Catch `ApiException` and inspect the `status` and `body` fields. Use `delete_namespaced_*` methods with `grace_period_seconds` for graceful termination. **Checkpoint:** Verify deletion with an immediate GET that returns 404.

---

## Implementation Patterns

### Pattern 1: Deploy an Application with Rolling Update

```python
import os
from kubernetes import client, config
from kubernetes.client.rest import ApiException


def create_deployment(
    name: str,
    image: str,
    namespace: str = "default",
    replicas: int = 3,
    container_port: int = 8080,
    labels: dict | None = None,
    env_vars: dict | None = None,
) -> dict:
    """Create a Kubernetes deployment with a rolling update strategy.

    Args:
        name: Deployment and container name.
        image: Container image with tag (e.g., "nginx:1.25").
        namespace: Target Kubernetes namespace.
        replicas: Desired replica count.
        container_port: Port the container exposes.
        labels: Custom labels for the deployment and pods.
        env_vars: Environment variables for the container.

    Returns:
        Dict with deployment name, namespace, and UID.

    Raises:
        ApiException: If the Kubernetes API rejects the request.
    """
    config.load_kube_config()
    apps_v1 = client.AppsV1Api()

    app_labels = {"app": name}
    if labels:
        app_labels.update(labels)

    # Define environment variables
    env_list = [
        client.V1EnvVar(name=k, value=v)
        for k, v in (env_vars or {}).items()
    ]

    # Build the deployment spec
    deployment = client.V1Deployment(
        metadata=client.V1ObjectMeta(name=name, labels=app_labels),
        spec=client.V1DeploymentSpec(
            replicas=replicas,
            selector=client.V1LabelSelector(match_labels=app_labels),
            strategy=client.V1DeploymentStrategy(
                type="RollingUpdate",
                rolling_update=client.V1RollingUpdateDeployment(
                    max_surge="25%",
                    max_unavailable="25%",
                ),
            ),
            template=client.V1PodTemplateSpec(
                metadata=client.V1ObjectMeta(labels=app_labels),
                spec=client.V1PodSpec(
                    containers=[
                        client.V1Container(
                            name=name,
                            image=image,
                            ports=[
                                client.V1ContainerPort(container_port=container_port)
                            ],
                            env=env_list or None,
                            resources=client.V1ResourceRequirements(
                                requests={"cpu": "100m", "memory": "128Mi"},
                                limits={"cpu": "500m", "memory": "256Mi"},
                            ),
                        )
                    ],
                ),
            ),
        ),
    )

    try:
        result = apps_v1.create_namespaced_deployment(
            namespace=namespace,
            body=deployment,
        )
    except ApiException as exc:
        raise RuntimeError(
            f"Failed to create deployment '{name}' in namespace '{namespace}': "
            f"HTTP {exc.status} — {exc.body}"
        ) from exc

    return {
        "name": result.metadata.name,
        "namespace": result.metadata.namespace,
        "uid": result.metadata.uid,
        "replicas": result.spec.replicas,
    }
```

### Pattern 2: Watch Pod Events and Stream Logs

```python
from kubernetes import client, config, watch
from kubernetes.client.rest import ApiException


def watch_pod_events(
    namespace: str = "default",
    label_selector: str = "app=my-service",
    timeout: int = 60,
) -> list[dict]:
    """Watch for pod events in a namespace and return state transitions.

    Args:
        namespace: Kubernetes namespace.
        label_selector: Label query to filter pods.
        timeout: Maximum seconds to watch.

    Returns:
        List of pod event dicts with type and object details.
    """
    config.load_kube_config()
    core_v1 = client.CoreV1Api()
    w = watch.Watch()

    events: list[dict] = []
    try:
        for event in w.stream(
            core_v1.list_namespaced_pod,
            namespace=namespace,
            label_selector=label_selector,
            _request_timeout=timeout,
        ):
            pod = event["object"]
            event_type = event["type"]
            pod_name = pod.metadata.name
            phase = pod.status.phase

            events.append({
                "type": event_type,
                "pod_name": pod_name,
                "phase": phase,
                "reason": (pod.status.conditions or [{}])[-1].get("reason", ""),
            })

            # Stop if all pods are running
            if phase == "Running":
                continue

    except ApiException as exc:
        if exc.status != 410:  # 410 = resource version too old, expected
            raise RuntimeError(
                f"Pod watch failed in namespace '{namespace}': "
                f"HTTP {exc.status}"
            ) from exc

    return events


def get_pod_logs(
    pod_name: str,
    namespace: str = "default",
    tail_lines: int = 100,
) -> str:
    """Retrieve the last N lines of logs from a pod.

    Args:
        pod_name: Name of the pod.
        namespace: Pod namespace.
        tail_lines: Number of recent log lines to fetch.

    Returns:
        Concatenated log output as a single string.
    """
    config.load_kube_config()
    core_v1 = client.CoreV1Api()

    try:
        log = core_v1.read_namespaced_pod_log(
            name=pod_name,
            namespace=namespace,
            tail_lines=tail_lines,
        )
    except ApiException as exc:
        raise RuntimeError(
            f"Failed to read logs from pod '{pod_name}': "
            f"HTTP {exc.status}" 
        ) from exc

    return log
```

### Pattern 3: Manage Custom Resource Definitions (CRDs)

```python
from kubernetes import client, config
from kubernetes.client.rest import ApiException
from kubernetes.dynamic import DynamicClient


def list_custom_resources(
    group: str,
    version: str,
    plural: str,
    namespace: str = "default",
) -> list[dict]:
    """List custom resources using the dynamic client.

    The dynamic client handles CRDs that are not part of the core
    Kubernetes API types.

    Args:
        group: API group (e.g., "cert-manager.io").
        version: API version (e.g., "v1").
        plural: Resource plural name (e.g., "certificates").
        namespace: Target namespace.

    Returns:
        List of custom resource objects as dicts.
    """
    config.load_kube_config()
    dynamic_client = DynamicClient(client.ApiClient())

    try:
        resources = dynamic_client.resources.get(
            api_version=f"{group}/{version}",
            kind=plural.capitalize(),
        )
    except ApiException as exc:
        raise RuntimeError(
            f"Failed to discover CRD API for {group}/{version}/{plural}: "
            f"HTTP {exc.status} — {exc.body}"
        ) from exc

    try:
        result = resources.get(namespace=namespace)
    except ApiException as exc:
        raise RuntimeError(
            f"Failed to list custom resources '{plural}' in namespace "
            f"'{namespace}': HTTP {exc.status}"
        ) from exc

    return result["items"]
```

### BAD vs GOOD: Error Handling with ApiException

```python
# ❌ BAD — catches everything, no context, no type hints
def get_deployment_bad(name, ns):
    try:
        api = client.AppsV1Api()
        return api.read_namespaced_deployment(name, ns)
    except Exception:
        return None  # Silent failure!

# ✅ GOOD — specific exception, meaningful error chain, typed return
from kubernetes.client.rest import ApiException

def get_deployment_good(
    name: str,
    namespace: str,
) -> client.V1Deployment:
    """Get a deployment by name. Raises if not found.

    Args:
        name: Deployment name.
        namespace: Kubernetes namespace.

    Returns:
        V1Deployment object.

    Raises:
        RuntimeError: If the API call fails.
    """
    config.load_kube_config()
    apps_v1 = client.AppsV1Api()
    try:
        return apps_v1.read_namespaced_deployment(name, namespace)
    except ApiException as exc:
        if exc.status == 404:
            raise RuntimeError(
                f"Deployment '{name}' not found in namespace '{namespace}'."
            ) from exc
        raise RuntimeError(
            f"Failed to get deployment '{name}': HTTP {exc.status} — {exc.body}"
        ) from exc
```

## MUST DO

- Use `config.load_incluster_config()` when running inside a pod (it uses the mounted ServiceAccount token)
- Always set `_request_timeout` on API calls to prevent hanging connections
- Use `watch.Watch().stream()` with a timeout to prevent stale watch connections from accumulating
- Prefer `patch_namespaced_*` over `replace_namespaced_*` for partial updates to avoid overwriting fields
- Use label selectors to filter resources instead of fetching all and filtering client-side
- Enable client-side logging with `logging.getLogger("urllib3").setLevel(logging.DEBUG)` for debugging

## MUST NOT DO

- Never disable TLS verification (`verify_ssl=False`) in production clusters
- Do not hardcode API tokens or kubeconfig paths in application code
- Avoid creating resources without setting `resourceVersion` on update requests
- Never use `delete_namespaced_*` without `grace_period_seconds` for pod termination
- Do not assume all API groups are available — use `get_api_resources()` to discover them
- Never ignore `409 Conflict` errors — they mean you have a stale object version

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

- [Kubernetes Python Client (client-python) Documentation](https://kubernetes.readthedocs.io/en/latest/)
- [client-python GitHub Repository](https://github.com/kubernetes-client/python)
- [PyPI — kubernetes](https://pypi.org/project/kubernetes/)
- [Kubernetes API Reference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.31/)
- [Kubernetes Client Libraries Overview](https://kubernetes.io/docs/reference/using-api/client-libraries/)
- [Kubernetes Python Client Examples](https://github.com/kubernetes-client/python/tree/master/examples)
- [Kubernetes RBAC Documentation](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-docker-api` | Docker Engine API for container and image management |
| `coding-terraform-sdk` | Terraform Kubernetes provider for declarative IaC |
| `coding-ansible-api` | Ansible Kubernetes collection for playbook-driven K8s management |
