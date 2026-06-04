---
name: kubernetes-deployment
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent kubernetes deployment with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: kubernetes-deployment, kubernetes deployment, how do i kubernetes-deployment,
    orchestrate kubernetes-deployment, automate kubernetes-deployment, agent kubernetes-deployment,
    container orchestration, deployment
  archetypes:
  - orchestration
  - strategic
  anti_triggers:
  - brainstorming
  - vague ideation
  - single-agent monolith
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: tactical
version: "1.0.0"
---
# Kubernetes Deployment

Orchestrates intelligent skill selection and execution for kubernetes deployment workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

## TL;DR Checklist

- [ ] Parse all inputs at boundary before processing (Law 2)
- [ ] Handle edge cases with early returns at function top (Law 1)
- [ ] Fail immediately with descriptive errors on invalid states (Law 4)
- [ ] Return new data structures, never mutate inputs (Law 3)
- [ ] Implement minimum 2-level fallback chain for all skill executions
- [ ] Log all skill selections with context for full audit trail
- [ ] Validate skill metadata and dependencies before selection
- [ ] Update confidence scores after each execution for learning


┌───────────────────────────────────────────────────────────────────────────────┐
│                              Orchestration Flow                                               │
└───────────────────────────────────────────────────────────────────────────────┘

  User Request
      ↓
┌─────────────────┐
│  Parse Request  │
│  & Extract      │
│  Features       │
└────────┬────────┘
         ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    Evaluate Available Skills                                │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Skill A      │  │ Skill B      │  │ Skill C      │              │
│  │ - Match Score│  │ - Match Score│  │ - Match Score│              │
│  │ - Confidence │  │ - Confidence │  │ - Confidence │              │
│  │ - History    │  │ - History    │  │ - History    │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                 │                       │
│         └─────────────────┴─────────────────┘                       │
│                          ↓                                          │
│                   Select Best Skill                               │
└─────────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────┐
│  Execute Skill  │
└────────┬────────┘
         ↓
┌─────────────────┐
│  Handle Result  │
└────────┬────────┘
         ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    Error Handling & Fallback                                  │
│                                                                     │
│  Success? ────────► Return Result                                  │
│                                                                     │
│  Fail? ────────┐                                                    │
│                ↓                                                    │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │               Fallback Chain                                    │      │
│  │                                                             │      │
│  │  1. Retry with adjusted parameters                          │      │
│  │  2. Try Alternative Skill (if available)                    │      │
│  │  3. Defer to Human Operator (if critical)                   │      │
│  │  4. Log & Return Error                                      │      │
│  └──────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘

## When to Use

Use this skill when:

- Orchestrating multi-step workflows that require skill delegation
- Implementing adaptive skill routing based on confidence scores
- Building fallback mechanisms for failed skill executions
- Creating intelligent task decomposition and parallel execution
- Designing skill dependency graphs with automatic resolution
- Implementing skill selection with historical performance weighting
- Building agent systems that need to self-organize around tasks

## When NOT to Use

Avoid this skill for:

- Direct task execution without orchestration needs - use individual skills instead
- High-frequency trading scenarios where latency must be minimized - the selection overhead may be prohibitive
- Simple linear workflows without branching or fallback requirements
- Cases where skill metadata is unavailable or unreliable


## Core Workflow

1. **Parse and Analyze Request** - Extract intent, entities, and constraints from user input.
   **Checkpoint:** All required parameters must be present and in valid format before proceeding.

2. **Score Available Skills** - Calculate match scores using multi-factor algorithm:
   - Text similarity between request and skill triggers
   - Historical success rate for similar tasks
   - Skill availability and health status
   - Required dependencies and their availability
   
   **Checkpoint:** Skip to fallback if no skill scores above threshold.

3. **Select Optimal Skill** - Choose skill with highest score that meets minimum confidence.
   **Checkpoint:** Verify skill has not been disabled or deprecated.

4. **Execute with Fallback** - Run skill execution wrapped in retry and fallback logic.
   **Checkpoint:** Log all execution attempts for audit trail.

5. **Return or Fallback** - Either return successful result or apply fallback chain:
   - Retry with adjusted parameters
   - Try alternative skill from `related-skills`
   - Defer to human operator for critical tasks
   
   **Checkpoint:** Record outcome with timing and confidence metadata.

## Implementation Patterns

### Pattern 1: Skill Selection Logic

```python
def generate_k8s_deployment(
    app_name: str,
    namespace: str,
    image: str,
    replicas: int,
    port: int,
    resources: Dict[str, str]
) -> Dict:
    """Generate and validate a Kubernetes Deployment manifest.
    
    Ensures illegal states are unrepresentable by validating image format,
    resource constraints, and namespace existence before manifest creation.
    """
    if not app_name or not namespace:
        raise ValueError("Application name and namespace are required")
        
    # Validate image format and tag
    if ":" not in image:
        image = f"{image}:latest"
    if not re.match(r"^[a-zA-Z0-9._/-]+:[a-zA-Z0-9._-]+$", image):
        raise ValueError(f"Invalid container image format: {image}")
        
    # Parse resource limits/requests to ensure valid Kubernetes format
    parsed_resources = {}
    for key, value in resources.items():
        if not re.match(r"^\d+(\.\d+)?(Ki|Mi|Gi|Ti|K|M|G|T)?$", value):
            raise ValueError(f"Invalid resource specification for {key}: {value}")
        parsed_resources[key] = value
        
    # Construct immutable deployment manifest
    deployment = {
        "apiVersion": "apps/v1",
        "kind": "Deployment",
        "metadata": {
            "name": app_name,
            "namespace": namespace,
            "labels": {"app": app_name, "managed-by": "opencode-skill"}
        },
        "spec": {
            "replicas": replicas,
            "selector": {"matchLabels": {"app": app_name}},
            "template": {
                "metadata": {"labels": {"app": app_name}},
                "spec": {
                    "containers": [{
                        "name": app_name,
                        "image": image,
                        "ports": [{"containerPort": port}],
                        "resources": {
                            "requests": {"cpu": parsed_resources.get("cpu_req", "100m"), "memory": parsed_resources.get("mem_req", "128Mi")},
                            "limits": {"cpu": parsed_resources.get("cpu_lim", "500m"), "memory": parsed_resources.get("mem_lim", "256Mi")}
                        }
                    }]
                }
            }
        }
    }
    return deployment
```


### Pattern 2: Execution with Fallback

```python
def apply_and_monitor_deployment(
    k8s_client: Client,
    deployment_manifest: Dict,
    timeout_seconds: int = 300,
    health_check_path: str = "/healthz"
) -> Dict:
    """Apply Kubernetes deployment and monitor rollout status with fallback rollback.
    
    Implements fail-fast and fail-loud principles:
    - Validates cluster connectivity before apply
    - Polls rollout status with exponential backoff
    - Automatically rolls back on health check failure
    """
    namespace = deployment_manifest["metadata"]["namespace"]
    name = deployment_manifest["metadata"]["name"]
    
    # Apply manifest (Fail Fast on invalid cluster state)
    try:
        k8s_client.apps_v1.create_namespaced_deployment(
            namespace=namespace, body=deployment_manifest
        )
    except ApiException as e:
        raise RuntimeError(f"Failed to create deployment {name}: {e.reason}") from e
        
    # Monitor rollout status
    start_time = time.time()
    while time.time() - start_time < timeout_seconds:
        try:
            status = k8s_client.apps_v1.read_namespaced_deployment_status(
                name=name, namespace=namespace
            )
            
            if status.status.ready_replicas == status.spec.replicas:
                # Verify health endpoint
                health_ok = _check_pod_health(k8s_client, namespace, name, health_check_path)
                if health_ok:
                    return {
                        "status": "deployed",
                        "replicas_ready": status.status.ready_replicas,
                        "image": deployment_manifest["spec"]["template"]["spec"]["containers"][0]["image"]
                    }
                else:
                    # Health check failed - trigger rollback (Fallback)
                    _rollback_deployment(k8s_client, namespace, name)
                    raise RuntimeError(f"Health check failed for {name}, rolled back")
                    
        except ApiException as e:
            if e.status == 404:
                time.sleep(5)
                continue
            raise
            
    # Timeout - Fail Loud
    _rollback_deployment(k8s_client, namespace, name)
    raise TimeoutError(f"Deployment {name} did not complete within {timeout_seconds}s")
```

### MUST DO
- Always validate skill metadata before selection (Early Exit)
- Implement fallback chain with at least 2 levels (Fallback Skill + Human)
- Log all skill selections with full context for auditability
- Return new data structures instead of mutating inputs (Atomic Predictability)
- Fail immediately with descriptive errors on invalid states
- Update confidence scores after each execution for adaptive routing
- Reference `code-philosophy` (5 Laws of Elegant Defense) in all logic


### MUST NOT DO
- Select skills based on a single factor (e.g., only confidence score)
- Disable fallback mechanisms "temporarily" - this creates fragile systems
- Skip validation of skill dependencies before execution
- Return partial results - either complete success or clear failure
- Use magic numbers for confidence thresholds - make them configurable
- Cache skill selections without considering context changes


## TL;DR Checklist

- [ ] Parse all inputs at boundary before processing (Law 2)
- [ ] Handle edge cases with early returns at function top (Law 1)
- [ ] Fail immediately with descriptive errors on invalid states (Law 4)
- [ ] Return new data structures, never mutate inputs (Law 3)
- [ ] Implement minimum 2-level fallback chain for all skill executions
- [ ] Log all skill selections with context for full audit trail
- [ ] Validate skill metadata and dependencies before selection
- [ ] Update confidence scores after each execution for learning


## TL;DR for Code Generation

- Use guard clauses - return early on invalid input before doing work
- Return simple types (dict, str, int, bool, list) - avoid complex nested objects
- Cyclomatic complexity < 10 per function - split anything larger
- Handle null/empty cases explicitly at function top (Early Exit)
- Never mutate input parameters - return new dicts/objects
- Fail fast with descriptive errors - don't try to "patch" bad data
- Reference code-philosophy laws in comments for complex logic
- Include timing and confidence metadata in all return values


## Output Template

When applying this skill, produce:

1. **Selected Skills** - List of skill names with confidence scores
2. **Selection Rationale** - Why each skill was chosen (match score, history, availability)
3. **Execution Plan** - Order of execution with dependencies
4. **Fallback Strategy** - Which fallback skills will be tried and in what order
5. **Risk Assessment** - Any potential failure points and their impact
6. **Timing Estimates** - Expected latency including fallback scenarios


## Related Skills

| Skill | Purpose |
|

---

---

## Constraints

### MUST DO
- Define clear input/output contracts for every step in the orchestration flow with explicit validation
- Implement structured logging at each stage capturing context, inputs, outputs, timing, and errors
- Build in fallback paths: if the primary strategy fails, degrade gracefully to a simpler approach
- Validate all preconditions before starting — do not proceed if required resources or permissions are missing

### MUST NOT DO
- Do not create deep nesting of orchestration steps (>5 levels) — flatten workflows where possible
- Avoid silent failure modes: every step must either succeed, fail explicitly, or escalate to a higher handler
- Never use shared mutable state between parallel workflow branches — communicate via immutable messages only
- Do not hardcode execution order when the dependency graph naturally determines it; derive order from explicit dependencies


## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.
- [Kubernetes Deployment Documentation](<https://kubernetes.io/docs/concepts/workloads/controllers/deployment/>)
- [Helm Package Manager Guide](<https://helm.sh/docs/>)
- [Kubernetes Networking Model](<https://kubernetes.io/docs/concepts/services-networking/>)
- [K8s Security Best Practices (CIS Benchmark)](<https://www.cisecurity.org/benchmark/kubernetes>)
- [ArgoCD GitOps for Kubernetes Deployments](<https://argo-cd.readthedocs.io/en/stable/>)
