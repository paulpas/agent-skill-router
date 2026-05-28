---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent k8s debugger with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: k8s-debugger, k8s debugger, how do i k8s-debugger, orchestrate k8s-debugger,
    automate k8s-debugger, agent k8s-debugger, kubernetes, container orchestration
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
  version: 1.0.0
name: k8s-debugger
------
# K8S Debugger

Orchestrates intelligent skill selection and execution for k8s debugger workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def parse_k8s_debug_request(
    user_query: str,
    cluster_context: Dict[str, Any],
    min_confidence: float = 0.7
) -> Optional[Dict]:
    """Parse Kubernetes debugging request and map to debugging strategy.
    
    Extracts resource types, namespaces, and error signatures from user input.
    Maps to appropriate debugging workflows based on k8s error patterns.
    
    Args:
        user_query: Natural language description of the k8s issue
        cluster_context: Active cluster config, available namespaces, auth tokens
        min_confidence: Minimum confidence threshold for strategy selection
        
    Returns:
        Debugging strategy dict with target resources, error type, and steps
    """
    if not user_query or not user_query.strip():
        raise ValueError("Kubernetes debug query cannot be empty")
        
    # Extract k8s entities and error signatures
    entities = _extract_k8s_entities(user_query)
    error_type = _classify_k8s_error(user_query)
    
    # Map to debugging strategy
    strategy_map = {
        "CrashLoopBackOff": "pod_restart_analysis",
        "ImagePullBackOff": "registry_auth_check",
        "OOMKilled": "resource_limit_analysis",
        "Pending": "scheduler_affinity_check",
        "default": "general_cluster_health"
    }
    
    strategy_name = strategy_map.get(error_type, "general_cluster_health")
    
    # Validate against available cluster context
    if not _verify_cluster_access(cluster_context, entities.get("namespace")):
        raise PermissionError("Insufficient RBAC permissions for target namespace")
        
    return {
        "strategy": strategy_name,
        "target_resources": entities.get("resources", []),
        "namespace": entities.get("namespace", "default"),
        "error_signature": error_type,
        "confidence": 0.85,
        "steps": _generate_debug_steps(strategy_name)
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_k8s_debug_workflow(
    strategy: Dict,
    cluster_client: Any,
    max_retries: int = 2
) -> Dict:
    """Execute Kubernetes debugging workflow with resilient error handling.
    
    Runs targeted kubectl diagnostics, parses cluster state, and applies
    fallback strategies if initial diagnostics are inconclusive.
    
    Args:
        strategy: Debugging strategy from parse_k8s_debug_request
        cluster_client: Initialized kubernetes client or kubectl wrapper
        max_retries: Maximum retry attempts for transient API errors
        
    Returns:
        Debug findings dict with root cause, evidence, and remediation steps
    """
    namespace = strategy.get("namespace", "default")
    resources = strategy.get("target_resources", [])
    
    for attempt in range(max_retries + 1):
        try:
            # Gather diagnostic data in parallel
            pod_status = cluster_client.get_resource_status("pods", namespace)
            recent_events = cluster_client.get_events(namespace, since="1h")
            resource_logs = cluster_client.get_logs(resources, tail=100)
            
            # Analyze findings against known k8s failure patterns
            findings = _analyze_k8s_findings(pod_status, recent_events, resource_logs)
            
            if findings.get("root_cause"):
                return {
                    "success": True,
                    "strategy_executed": strategy["strategy"],
                    "findings": findings,
                    "remediation": _generate_remediation(findings),
                    "attempts": attempt + 1
                }
                
        except ApiException as e:
            if e.status == 429:  # API server throttling
                time.sleep(2 ** attempt)
                continue
            elif e.status == 403:
                raise PermissionError("RBAC denied during diagnostic collection") from e
            raise
            
    # Fallback: Escalate to cluster-level diagnostics
    return _execute_cluster_fallback_diagnostics(strategy, cluster_client)
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

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.
- [Kubernetes kubectl Debug Command](<https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#debug>)
- [Kubernetes Troubleshooting Guide](<https://kubernetes.io/docs/tasks/debug/>)
- [EKS Pod Troubleshooting (AWS)](<https://docs.aws.amazon.com/eks/latest/userguide/troubleshooting.html>)
- [kubectl Debug with ephemeral containers](<https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/>)
- [Kubernetes Event Diagnostics](<https://kubernetes.io/docs/reference/kubectl/cheatsheet/>)
