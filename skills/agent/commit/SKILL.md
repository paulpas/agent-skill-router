---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent commit with multi-factor skill selection, fallback
  chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: commit, commit, how do i commit, orchestrate commit, automate commit,
    agent commit
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
name: commit
------
# Commit

Orchestrates intelligent skill selection and execution for commit workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def prepare_commit_payload(
    staged_files: List[str],
    user_intent: str,
    commit_rules: Dict
) -> Dict:
    """Analyze staged changes and generate a validated commit payload.
    
    Implements Law 2 (Parse at boundary) by validating file paths and intent.
    Implements Law 3 (Atomic Predictability) by returning a new payload dict.
    """
    if not staged_files:
        raise ValueError("No files staged for commit")
    
    # Extract change types and scope
    change_types = _classify_changes(staged_files)
    scope = _determine_scope(staged_files, commit_rules.get("scope_rules"))
    
    # Generate conventional commit message based on intent and changes
    type_map = {"feat": "feat", "fix": "fix", "refactor": "refactor", "chore": "chore"}
    commit_type = type_map.get(change_types.get("primary", "chore"), "chore")
    
    description = _generate_description(user_intent, change_types)
    body = _extract_affected_components(staged_files)
    
    # Validate against commit rules (Law 4: Fail Fast)
    if len(description) > 72:
        raise ValueError("Commit description exceeds 72 characters")
    if not commit_rules.get("allow_empty", False) and change_types.get("lines_changed", 0) == 0:
        raise ValueError("Commit would be empty")
        
    return {
        "type": commit_type,
        "scope": scope,
        "description": description,
        "body": body,
        "files": staged_files,
        "timestamp": time.time()
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_commit_workflow(
    commit_payload: Dict,
    repo_path: str,
    fallback_strategy: str = "interactive"
) -> Dict:
    """Execute git commit with domain-specific fallback chain.
    
    Implements Law 1 (Early Exit) and Law 4 (Fail Loud) for git operations.
    Fallback chain: amend -> interactive staging -> manual patch review.
    """
    if not commit_payload.get("description"):
        raise ValueError("Commit payload missing description")
        
    commit_cmd = f"git -C {repo_path} commit -m \"{commit_payload['type']}: {commit_payload['description']}\""
    if commit_payload.get("body"):
        commit_cmd += f"\n\n{commit_payload['body']}"
        
    try:
        # Attempt direct commit
        result = subprocess.run(commit_cmd, shell=True, capture_output=True, text=True, check=True)
        return {
            "success": True,
            "commit_hash": result.stdout.strip(),
            "strategy": "direct",
            "attempts": 1
        }
    except subprocess.CalledProcessError as e:
        stderr = e.stderr.lower()
        
        # Fallback 1: Pre-commit hook failure or linting issue
        if "pre-commit" in stderr or "lint" in stderr:
            return _apply_hook_fallback(repo_path, commit_payload)
            
        # Fallback 2: Empty commit or no changes detected
        if "nothing added" in stderr or "no changes" in stderr:
            return _apply_amend_fallback(repo_path, commit_payload)
            
        # Fallback 3: Conflict or merge state
        if "conflict" in stderr or "merge" in stderr:
            return _apply_interactive_fallback(repo_path, commit_payload, fallback_strategy)
            
        # Fail Loud: Unhandled git error
        raise GitCommitError(f"Unhandled commit failure: {stderr}") from e
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