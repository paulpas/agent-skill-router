---




name: github-workflow-automation
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent github workflow automation with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: github-workflow-automation, github workflow automation, how do i github-workflow-automation,
    orchestrate github-workflow-automation, automate github-workflow-automation, agent
    github-workflow-automation
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




# Github Workflow Automation

Orchestrates intelligent skill selection and execution for github workflow automation workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def select_and_prepare_workflow_run(
    repo_owner: str,
    repo_name: str,
    workflow_id: str,
    branch: str,
    inputs: Dict[str, Any],
    github_client: GitHubClient
) -> Dict[str, Any]:
    """Select optimal workflow dispatch parameters and validate against repository constraints.
    
    Implements Law 2 (Parse at boundary) by validating branch existence and workflow configuration.
    Implements Law 1 (Early Exit) by checking repo permissions and workflow status immediately.
    """
    # Early exit: validate repository access and workflow existence
    try:
        workflow = github_client.get_workflow(repo_owner, repo_name, workflow_id)
        if workflow.get("state") != "active":
            raise ValueError(f"Workflow {workflow_id} is not active in {repo_owner}/{repo_name}")
    except RepositoryNotFoundError:
        raise ValueError(f"Repository {repo_owner}/{repo_name} not found or inaccessible")
    
    # Parse and validate branch inputs (Law 2)
    if not branch or not branch.strip():
        raise ValueError("Target branch must be specified for workflow dispatch")
    
    # Check branch protection rules and required status checks
    branch_protection = github_client.get_branch_protection(repo_owner, repo_name, branch)
    if branch_protection.get("required_status_checks"):
        required_checks = branch_protection["required_status_checks"]["strict"]
        if not required_checks:
            raise ValueError(f"Branch {branch} requires strict status checks before workflow dispatch")
    
    # Construct dispatch payload with validated inputs
    dispatch_payload = {
        "ref": branch,
        "inputs": {k: str(v) for k, v in inputs.items()}
    }
    
    # Return new structure (Law 3)
    return {
        "workflow_id": workflow_id,
        "dispatch_payload": dispatch_payload,
        "validation_timestamp": time.time(),
        "branch_protected": branch_protection.get("protected", False)
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_workflow_with_fallback(
    repo_owner: str,
    repo_name: str,
    workflow_id: str,
    dispatch_payload: Dict[str, Any],
    fallback_workflow_id: Optional[str] = None,
    max_retries: int = 2
) -> Dict[str, Any]:
    """Execute GitHub Actions workflow dispatch with resilient fallback chain.
    
    Implements Law 4 (Fail Fast/Loud) by immediately raising on invalid payloads.
    Implements fallback chain: retry dispatch -> fallback workflow -> manual alert.
    """
    # Guard clause: validate payload structure
    if "ref" not in dispatch_payload or "inputs" not in dispatch_payload:
        raise ValueError("Dispatch payload must contain 'ref' and 'inputs' keys")
    
    last_exception = None
    for attempt in range(max_retries + 1):
        try:
            # Execute primary workflow dispatch
            response = github_client.create_workflow_dispatch(
                repo_owner, repo_name, workflow_id, dispatch_payload
            )
            
            # Verify run was created successfully
            if response.status_code == 201:
                run_id = response.json().get("id")
                return {
                    "success": True,
                    "run_id": run_id,
                    "workflow_id": workflow_id,
                    "attempts": attempt + 1,
                    "status_url": f"https://github.com/{repo_owner}/{repo_name}/actions/runs/{run_id}"
                }
            else:
                raise RuntimeError(f"Unexpected status code: {response.status_code}")
                
        except RateLimitExceededError:
            last_exception = sys.exc_info()
            if attempt < max_retries:
                time.sleep(2 ** attempt)
                continue
        except TransientAPIError as e:
            last_exception = sys.exc_info()
            if attempt < max_retries:
                continue
            break
        
    # Fallback chain: try alternative workflow if primary exhausted
    if fallback_workflow_id and attempt == max_retries:
        try:
            fallback_payload = {**dispatch_payload, "inputs": {**dispatch_payload["inputs"], "fallback": "true"}}
            fallback_response = github_client.create_workflow_dispatch(
                repo_owner, repo_name, fallback_workflow_id, fallback_payload
            )
            if fallback_response.status_code == 201:
                return {
                    "success": True,
                    "run_id": fallback_response.json().get("id"),
                    "workflow_id": fallback_workflow_id,
                    "fallback_triggered": True
                }
        except Exception as fallback_err:
            last_exception = fallback_err
    
    # Fail Loud: raise comprehensive error after all attempts
    raise WorkflowExecutionError(
        f"Failed to dispatch workflow {workflow_id} after {max_retries + 1} attempts. "
        f"Last error: {last_exception}"
    )
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

## Constraints

### MUST DO
- Implement idempotent automation triggers: running the same automation twice should not create duplicate resources or actions
- Validate all trigger conditions with explicit allowlists before executing automated actions
- Include rollback procedures in every automation workflow — every CREATE should have a corresponding DELETE capability
- Log all automation executions with input state, output state, duration, and any errors for monitoring and debugging

### MUST NOT DO
- Do not create circular automation loops where trigger A causes action B which triggers A again
- Avoid using automations that modify production data without explicit human approval gates
- Never embed API keys or credentials directly in automation workflows — use vaulted secrets with rotation
- Do not assume external service availability; implement retry logic with exponential backoff and dead-letter queues


## Related Skills

| Skill | Purpose |
|