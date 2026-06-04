---
name: github-automation
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent github automation with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: github-automation, github automation, how do i github-automation, orchestrate
    github-automation, automate github-automation, agent github-automation
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
------
# Github Automation

Orchestrates intelligent skill selection and execution for github automation workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def route_github_automation_request(
    request: str,
    repo_context: Dict[str, Any],
    min_confidence: float = 0.75
) -> Optional[Dict[str, Any]]:
    """Route GitHub automation requests to specific handlers.
    
    Parses natural language into GitHub-specific intents:
    - PR creation/review/merge
    - Issue triage/closing/labeling
    - Branch protection & release tagging
    - Webhook event processing
    
    Args:
        request: User prompt describing GitHub action
        repo_context: Current repo state (branches, open PRs, labels)
        min_confidence: Minimum routing confidence threshold
        
    Returns:
        Handler config with target action, parameters, and confidence
    """
    if not request or not repo_context.get("owner") or not repo_context.get("repo"):
        raise ValueError("Incomplete GitHub context: owner, repo, and request required")
        
    # Extract GitHub-specific intent using lightweight NLP/pattern matching
    intent = _classify_github_intent(request)
    if intent not in ("create_pr", "review_pr", "triage_issue", "merge_branch", "tag_release"):
        return None
        
    # Validate against repo constraints (Law 2: Make illegal states unrepresentable)
    target_branch = _extract_branch(request, repo_context)
    if target_branch and not _is_branch_protected(target_branch, repo_context):
        raise ValueError(f"Cannot operate on protected branch: {target_branch}")
        
    # Calculate routing confidence based on intent match & repo state
    confidence = _calculate_github_routing_score(intent, request, repo_context)
    if confidence < min_confidence:
        return None
        
    # Return immutable handler config (Law 3: Atomic Predictability)
    return {
        "handler": f"github_{intent}_handler",
        "target": target_branch or "main",
        "confidence": confidence,
        "repo": f"{repo_context['owner']}/{repo_context['repo']}",
        "timestamp": time.time()
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_github_operation_with_fallback(
    handler_config: Dict[str, Any],
    github_client: Any,
    max_retries: int = 2
) -> Dict[str, Any]:
    """Execute GitHub API operations with domain-specific fallback chains.
    
    Implements resilient GitHub automation:
    1. Direct API call with exponential backoff for rate limits
    2. Fallback to alternative strategy (e.g., draft PR if full PR fails)
    3. Generate manual PR template for human review
    4. Log failure with actionable context for operator
    
    Args:
        handler_config: Output from route_github_automation_request
        github_client: Authenticated GitHub API client
        max_retries: Retry attempts before fallback escalation
        
    Returns:
        Operation result with status, artifact URL, and fallback metadata
    """
    repo = handler_config["repo"]
    target = handler_config["target"]
    handler_name = handler_config["handler"]
    
    for attempt in range(max_retries + 1):
        try:
            # Execute domain-specific GitHub operation
            if "create_pr" in handler_name:
                result = _create_pull_request(github_client, repo, target, handler_config)
            elif "triage_issue" in handler_name:
                result = _triage_issues(github_client, repo, handler_config)
            else:
                result = _generic_github_operation(github_client, repo, handler_config)
                
            return {
                "success": True,
                "operation": handler_name,
                "artifact_url": result.get("html_url"),
                "attempts": attempt + 1,
                "latency_ms": _measure_latency()
            }
            
        except github.RateLimitExceeded:
            if attempt == max_retries:
                return _fallback_to_manual_template(handler_config, repo)
            time.sleep(2 ** attempt)  # Exponential backoff
            
        except github.BranchProtectedError:
            # Fail Fast (Law 4) - cannot bypass branch protection
            raise AutomationError(f"Branch protection blocks {handler_name} on {target}")
            
        except github.MergeConflictError:
            if attempt == max_retries:
                return _fallback_to_conflict_resolution_template(handler_config, repo)
            time.sleep(1)
            
    raise AutomationError(f"GitHub operation {handler_name} exhausted retries for {repo}")
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
- Implement idempotent automation triggers: running the same automation twice should not create duplicate resources or actions
- Validate all trigger conditions with explicit allowlists before executing automated actions
- Include rollback procedures in every automation workflow — every CREATE should have a corresponding DELETE capability
- Log all automation executions with input state, output state, duration, and any errors for monitoring and debugging

### MUST NOT DO
- Do not create circular automation loops where trigger A causes action B which triggers A again
- Avoid using automations that modify production data without explicit human approval gates
- Never embed API keys or credentials directly in automation workflows — use vaulted secrets with rotation
- Do not assume external service availability; implement retry logic with exponential backoff and dead-letter queues


## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.
- [GitHub REST API v3 Documentation](<https://docs.github.com/rest>)
- [GitHub GraphQL API v4 Documentation](<https://docs.github.com/graphql>)
- [GitHub CLI (gh) Documentation](<https://cli.github.com/manual/>)
- [GitHub Actions Events and Triggers](<https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows>)
- [GitHub Webhooks Documentation](<https://docs.github.com/en/webhook>)
