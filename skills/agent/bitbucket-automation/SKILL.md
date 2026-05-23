---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent bitbucket automation with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: bitbucket-automation, bitbucket automation, how do i bitbucket-automation,
    orchestrate bitbucket-automation, automate bitbucket-automation, agent bitbucket-automation
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
name: bitbucket-automation
------
# Bitbucket Automation

Orchestrates intelligent skill selection and execution for bitbucket automation workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
import requests
from typing import Dict, List, Optional
import time

BITBUCKET_API_BASE = "https://api.bitbucket.org/2.0"

def create_or_update_pr(
    workspace: str,
    repo_slug: str,
    source_branch: str,
    target_branch: str,
    title: str,
    description: str,
    bitbucket_auth: Dict[str, str]
) -> Dict:
    """Orchestrates Bitbucket PR creation/update with domain-specific fallback logic.
    
    Implements Law 1 (Early Exit) and Law 4 (Fail Fast) for API interactions.
    Handles merge conflicts and pipeline waits as domain-specific fallbacks.
    """
    # Law 1: Early exit on invalid inputs
    if not all([workspace, repo_slug, source_branch, target_branch, title]):
        raise ValueError("Missing required Bitbucket parameters")
        
    headers = {
        "Authorization": f"Bearer {bitbucket_auth.get('token')}",
        "Content-Type": "application/json"
    }
    
    # Law 2: Parse/validate state before mutation
    pr_payload = {
        "title": title,
        "description": description,
        "source": {"branch": {"name": source_branch}},
        "destination": {"branch": {"name": target_branch}}
    }
    
    # Check for existing PR to avoid duplicates (Law 3: Atomic Predictability)
    existing_prs = requests.get(
        f"{BITBUCKET_API_BASE}/repositories/{workspace}/{repo_slug}/pullrequests",
        headers=headers,
        params={"state": "OPEN", "source": source_branch}
    ).json()
    
    if existing_prs.get("values"):
        pr_id = existing_prs["values"][0]["id"]
        update_url = f"{BITBUCKET_API_BASE}/repositories/{workspace}/{repo_slug}/pullrequests/{pr_id}"
        requests.put(update_url, headers=headers, json=pr_payload)
        return {"action": "updated", "pr_id": pr_id, "url": existing_prs["values"][0]["links"]["html"]["href"]}
    
    # Create new PR with domain-specific retry logic
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = requests.post(
                f"{BITBUCKET_API_BASE}/repositories/{workspace}/{repo_slug}/pullrequests",
                headers=headers,
                json=pr_payload
            )
            response.raise_for_status()
            pr_data = response.json()
            
            # Law 4: Fail fast on merge conflicts
            if pr_data.get("merge_conflicts"):
                raise MergeConflictError("Target branch has unresolvable conflicts")
                
            return {
                "action": "created",
                "pr_id": pr_data["id"],
                "url": pr_data["links"]["html"]["href"],
                "pipeline_status": "pending"
            }
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 429:
                time.sleep(2 ** attempt)  # Exponential backoff
                continue
            raise
            
    raise RuntimeError("Failed to create PR after retries")
```


### Pattern 2: Execution with Fallback

```python
def sync_branch_and_wait_for_pipelines(
    workspace: str,
    repo_slug: str,
    branch_name: str,
    commit_sha: str,
    bitbucket_auth: Dict[str, str],
    timeout_minutes: int = 30
) -> Dict:
    """Automates branch sync and pipeline monitoring for Bitbucket repositories.
    
    Demonstrates domain-specific fallback: if pipeline fails, triggers manual review flag.
    """
    headers = {"Authorization": f"Bearer {bitbucket_auth.get('token')}"}
    pipeline_url = f"{BITBUCKET_API_BASE}/repositories/{workspace}/{repo_slug}/pipelines"
    
    # Push commit if needed
    if commit_sha:
        requests.post(
            f"{BITBUCKET_API_BASE}/repositories/{workspace}/{repo_slug}/refs/branches/{branch_name}",
            headers=headers,
            json={"name": branch_name, "target": {"hash": commit_sha}}
        )
        
    # Monitor pipeline status with domain-specific fallback
    start_time = time.time()
    while time.time() - start_time < timeout_minutes * 60:
        pipelines = requests.get(pipeline_url, headers=headers, params={"branch": branch_name}).json()
        if not pipelines.get("values"):
            break
            
        current_pipeline = pipelines["values"][0]
        status = current_pipeline["state"]["name"]
        
        if status == "COMPLETED":
            if current_pipeline["result"] == "SUCCESSFUL":
                return {"status": "passed", "pipeline_id": current_pipeline["uuid"]}
            else:
                # Domain fallback: flag for manual review instead of silent failure
                return {
                    "status": "failed",
                    "pipeline_id": current_pipeline["uuid"],
                    "fallback_action": "trigger_manual_review",
                    "error_details": current_pipeline.get("error", {})
                }
        elif status in ("STOPPED", "ERROR"):
            return {"status": "terminated", "pipeline_id": current_pipeline["uuid"]}
            
        time.sleep(15)  # Poll interval
        
    return {"status": "timeout", "fallback_action": "notify_team_channel"}
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