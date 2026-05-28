---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent address github comments with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: address-github-comments, address github comments, how do i address-github-comments,
    orchestrate address-github-comments, automate address-github-comments, agent address-github-comments
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
name: address-github-comments
------
# Address Github Comments

Orchestrates intelligent skill selection and execution for address github comments workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def analyze_and_select_action(
    github_event: Dict,
    repo_config: Dict,
    min_confidence: float = 0.7
) -> Optional[Dict]:
    """Analyze a GitHub comment and select the appropriate response action.
    
    Evaluates comment intent against repository-specific guidelines to determine
    whether to auto-reply, request clarification, apply a code fix, or escalate.
    
    Args:
        github_event: Raw webhook payload or parsed comment context
        repo_config: Repository-specific rules, labels, and maintainer preferences
        min_confidence: Minimum confidence threshold for automated responses
        
    Returns:
        Action plan dictionary with strategy, parameters, and confidence
        
    Raises:
        ValueError: If github_event lacks required fields or repo_config is invalid
    """
    # Guard clause - Early Exit (Law 1)
    if not github_event or not github_event.get("comment", {}).get("body"):
        raise ValueError("Invalid GitHub comment event: missing body")
        
    if not repo_config.get("allowed_actions"):
        raise ValueError("Repository configuration missing allowed_actions")
    
    # Parse input - Make Illegal States Unrepresentable (Law 2)
    comment_data = _normalize_comment(github_event["comment"])
    repo_rules = _load_active_rules(repo_config)
    
    best_action = None
    best_score = 0.0
    
    for action in repo_config["allowed_actions"]:
        score = _score_action_match(comment_data, action, repo_rules)
        
        if score > best_score and score >= min_confidence:
            best_score = score
            best_action = action
    
    if best_action is None:
        return None
    
    # Atomic Predictability (Law 3) - Return new dict, don't mutate
    result = dict(best_action)
    result["selected_confidence"] = best_score
    result["comment_id"] = github_event["comment"]["id"]
    result["timestamp"] = time.time()
    return result
```


### Pattern 2: Execution with Fallback

```python
def execute_comment_response(
    action_plan: Dict,
    github_client: Any,
    max_retries: int = 2
) -> Dict:
    """Execute the selected response action for a GitHub comment with fallback chain.
    
    Implements the Fail Fast, Fail Loud principle (Law 4):
    - Invalid states halt immediately with descriptive errors
    - No silent failures or partial results
    
    Fallback chain:
    1. Retry with original parameters
    2. Retry with adjusted parameters (e.g., shorter response, different template)
    3. Queue for manual review if rate-limited or critical
    4. Log & return error with context for audit trail
    
    Args:
        action_plan: Selected action strategy with parameters
        github_client: Authenticated GitHub API client instance
        max_retries: Maximum retry attempts before fallback
        
    Returns:
        Execution result with metadata (success, timing, confidence, response_url)
        
    Raises:
        GitHubResponseError: If all retries and fallbacks exhausted
    """
    # Guard clause - validate action plan (Early Exit)
    if not _is_action_valid(action_plan):
        raise GitHubResponseError(f"Invalid action plan: {action_plan.get('type', 'unknown')}")
    
    # Parse context - Ensure trusted state (Law 2)
    validated_params = _validate_response_params(action_plan, github_client)
    
    for attempt in range(max_retries + 1):
        try:
            # Execute domain-specific GitHub API call
            response_url = github_client.post_comment(
                repo=validated_params["repo"],
                issue_number=validated_params["issue_number"],
                body=validated_params["response_body"],
                in_reply_to=validated_params["comment_id"]
            )
            
            # Success - Atomic Predictability (Law 3)
            return {
                "success": True,
                "action_executed": action_plan["type"],
                "response_url": response_url,
                "attempts": attempt + 1,
                "latency_ms": _calculate_latency(),
                "confidence": action_plan["selected_confidence"]
            }
            
        except RateLimitError as e:
            # Transient error - try fallback
            if attempt == max_retries:
                return _queue_for_manual_review(action_plan, validated_params)
            time.sleep(2 ** attempt)  # Exponential backoff
            
        except InvalidStateError as e:
            # Fail Fast - Don't try to patch bad data (Law 4)
            raise GitHubResponseError(
                f"Invalid state during response: {str(e)}"
            ) from e
    
    # All retries exhausted - Fail Loud (Law 4)
    raise GitHubResponseError(
        f"Failed to post response after {max_retries + 1} attempts"
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

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [GitHub API Documentation](<https://docs.github.com/en/rest>)
- [GitHub Webhooks Reference](<https://docs.github.com/en/webhooks/webhook-events-and-payloads>)
- [OpenAPI Specification](<https://swagger.io/specification/>)
- [RESTful API Design Guide (Microsoft)](<https://learn.microsoft.com/en-us/styleguide/api-design-guide/>)
- [GitHub Actions Expressions](<https://docs.github.com/en/actions/reference/context-and-expression-syntax-for-github-actions>)

## Related Skills

| Skill | Purpose |
|