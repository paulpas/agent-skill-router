---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent gitlab automation with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: gitlab-automation, gitlab automation, how do i gitlab-automation, orchestrate
    gitlab-automation, automate gitlab-automation, agent gitlab-automation
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
name: gitlab-automation
------
# Gitlab Automation

Orchestrates intelligent skill selection and execution for gitlab automation workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def parse_gitlab_automation_context(user_input: str, project_config: Dict) -> Dict:
    """Parse user request into GitLab-specific automation context.
    
    Extracts project identifiers, branch targets, and CI/CD parameters
    while validating against GitLab API constraints and access controls.
    """
    import re
    from urllib.parse import urlparse

    # Guard clause - Early Exit (Law 1)
    if not user_input or not project_config.get("api_token"):
        raise ValueError("Missing GitLab project configuration or authentication token")

    # Parse input - Make Illegal States Unrepresentable (Law 2)
    url_match = re.search(r'gitlab\.com/([^/]+/[^/]+)', user_input)
    if not url_match:
        raise ValueError("Invalid GitLab project URL format")
        
    project_path = url_match.group(1)
    branch_match = re.search(r'--branch\s+(\S+)', user_input)
    target_branch = branch_match.group(1) if branch_match else project_config.get("default_branch", "main")
    
    # Validate against GitLab API constraints
    if not re.match(r'^[a-zA-Z0-9_.-]+$', target_branch):
        raise ValueError("Invalid GitLab branch name format")
        
    # Atomic Predictability (Law 3) - Return new structured context
    return {
        "project_path": project_path,
        "source_branch": target_branch,
        "api_base_url": f"https://gitlab.com/api/v4/projects/{project_path}",
        "auth_headers": {"PRIVATE-TOKEN": project_config["api_token"]},
        "automation_type": "ci_cd_orchestration",
        "validation_timestamp": time.time()
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_gitlab_pipeline_with_fallback(context: Dict, pipeline_vars: Dict, max_retries: int = 2) -> Dict:
    """Execute GitLab CI/CD pipeline trigger with domain-specific fallback handling.
    
    Implements resilient GitLab API interactions:
    - Handles 403/401 auth failures immediately (Fail Fast)
    - Retries on 429 rate limits with exponential backoff
    - Falls back to manual MR approval if pipeline trigger fails
    """
    import time
    import requests

    # Guard clause - validate context (Early Exit)
    if not context.get("api_base_url") or not context.get("auth_headers"):
        raise ValueError("Incomplete GitLab automation context")

    payload = {
        "ref": context["source_branch"],
        "variables": pipeline_vars,
        "commit": True
    }

    for attempt in range(max_retries + 1):
        try:
            response = requests.post(
                f"{context['api_base_url']}/pipeline",
                headers=context["auth_headers"],
                json=payload,
                timeout=30
            )
            
            # Success - Atomic Predictability (Law 3)
            if response.status_code == 201:
                return {
                    "success": True,
                    "pipeline_id": response.json()["id"],
                    "status_url": response.json()["web_url"],
                    "attempts": attempt + 1
                }
                
            # Fail Fast - Invalid state or auth (Law 4)
            if response.status_code in (401, 403):
                raise PermissionError(f"GitLab API rejected access: {response.json().get('message')}")
                
            # Transient error - Retry with backoff
            if response.status_code == 429:
                wait_time = 2 ** attempt
                time.sleep(wait_time)
                continue
                
        except requests.exceptions.RequestException as e:
            if attempt == max_retries:
                return _fallback_to_manual_approval(context, pipeline_vars)
            time.sleep(1)
            
    # All retries exhausted - Fail Loud (Law 4)
    raise RuntimeError(f"GitLab pipeline trigger failed after {max_retries + 1} attempts")
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