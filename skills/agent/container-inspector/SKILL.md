---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent container inspector with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: container-inspector, container inspector, how do i container-inspector,
    orchestrate container-inspector, automate container-inspector, agent container-inspector
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
name: container-inspector
------
# Container Inspector

Orchestrates intelligent skill selection and execution for container inspector workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def analyze_container_manifest(
    container_id: str,
    inspection_targets: List[str],
    min_security_score: float = 0.8
) -> Dict:
    """Analyze container manifest and runtime state for inspection readiness.
    
    Extracts critical inspection vectors:
    - Image layer composition and base OS vulnerabilities
    - Runtime resource limits (CPU, memory, PID)
    - Network exposure and privileged flags
    - Health check configuration and restart policies
    
    Args:
        container_id: Target container ID or image reference
        inspection_targets: List of inspection vectors to prioritize
        min_security_score: Minimum acceptable security posture score
        
    Returns:
        Inspection readiness dict with extracted features and risk flags
    """
    # Guard clause - validate container reference (Law 1)
    if not container_id or not re.match(r'^[a-zA-Z0-9._-]+$', container_id):
        raise ValueError(f"Invalid container reference: {container_id}")
    
    # Parse runtime state - Make Illegal States Unrepresentable (Law 2)
    runtime_state = _fetch_container_state(container_id)
    if runtime_state.get("Status") == "exited":
        return {"ready": False, "reason": "Container is stopped", "state": runtime_state}
        
    inspection_features = {
        "has_healthcheck": bool(runtime_state.get("Config", {}).get("Healthcheck")),
        "privileged": runtime_state.get("HostConfig", {}).get("Privileged", False),
        "network_mode": runtime_state.get("HostConfig", {}).get("NetworkMode"),
        "resource_limits": runtime_state.get("HostConfig", {}).get("Memory"),
        "base_image": runtime_state.get("Config", {}).get("Image")
    }
    
    # Calculate inspection readiness score
    risk_penalty = 0.0
    if inspection_features["privileged"]:
        risk_penalty += 0.4
    if inspection_features["network_mode"] == "host":
        risk_penalty += 0.3
        
    readiness_score = max(0.0, 1.0 - risk_penalty)
    
    if readiness_score < min_security_score:
        return {"ready": False, "score": readiness_score, "flags": ["high_risk_config"]}
        
    # Atomic Predictability (Law 3) - Return new dict
    return {
        "ready": True,
        "score": readiness_score,
        "features": dict(inspection_features),
        "timestamp": time.time()
    }
```


### Pattern 2: Execution with Fallback

```python
def run_inspection_pipeline(
    target: str,
    scan_depth: str = "full",
    max_retries: int = 2
) -> Dict:
    """Execute container inspection pipeline with resilience fallbacks.
    
    Implements Fail Fast, Fail Loud (Law 4) for inspection operations:
    - Invalid container states halt immediately
    - Network timeouts for CVE databases trigger offline fallback
    - No silent partial scans or corrupted manifests
    
    Fallback chain:
    1. Retry live inspection with adjusted timeout
    2. Fall back to cached manifest/layer analysis
    3. Defer to manual audit for critical security gaps
    
    Args:
        target: Container ID, image name, or archive path
        scan_depth: 'quick', 'full', or 'deep' inspection level
        max_retries: Maximum retry attempts for transient failures
        
    Returns:
        Inspection report with findings, confidence, and execution metadata
    """
    # Guard clause - validate target (Early Exit)
    if not target or not _is_valid_container_reference(target):
        raise InspectionError(f"Invalid inspection target: {target}")
        
    # Parse context - Ensure trusted state (Law 2)
    validated_target = _resolve_target_path(target)
    
    for attempt in range(max_retries + 1):
        try:
            if scan_depth == "quick":
                report = _run_quick_inspect(validated_target)
            else:
                report = _run_full_security_scan(validated_target)
                
            # Success - Atomic Predictability (Law 3)
            return {
                "success": True,
                "target": validated_target,
                "depth": scan_depth,
                "findings": report,
                "attempts": attempt + 1,
                "latency_ms": _measure_execution_time()
            }
            
        except NetworkTimeoutError as e:
            # CVE DB unreachable - try offline fallback
            if attempt == max_retries:
                return _execute_offline_manifest_scan(validated_target)
            continue
            
        except CorruptedLayerError as e:
            # Fail Fast - Don't patch corrupted data (Law 4)
            raise InspectionError(f"Corrupted layer in {validated_target}: {str(e)}") from e
            
    # All retries exhausted - Fail Loud (Law 4)
    raise InspectionError(f"Inspection failed for {validated_target} after {max_retries + 1} attempts")
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



---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Docker Security Best Practices](<https://docs.docker.com/security/>)
- [Container Scanning with Trivy](<https://aquasecurity.github.io/trivy/>)
- [CIS Docker Benchmark](<https://www.cisecurity.org/benchmark/docker>)
- [Open Container Initiative (OCI) Specs](<https://opencontainers.org/>)
- [Kubernetes Pod Security Standards](<https://kubernetes.io/docs/concepts/security/pod-security-standards/>)

## Related Skills

| Skill | Purpose |
|