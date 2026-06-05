---




name: git-pr-workflows-onboard
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent git pr workflows onboard with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: git-pr-workflows-onboard, git pr workflows onboard, how do i git-pr-workflows-onboard,
    orchestrate git-pr-workflows-onboard, automate git-pr-workflows-onboard, agent
    git-pr-workflows-onboard
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




# Git Pr Workflows Onboard

Orchestrates intelligent skill selection and execution for git pr workflows onboard workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def analyze_pr_context_and_route(
    pr_metadata: Dict[str, Any],
    repo_config: Dict[str, Any],
    available_onboarding_skills: List[Dict],
    min_confidence: float = 0.75
) -> Optional[Dict]:
    """Route PR onboarding tasks to optimal sub-skill based on workflow context.
    
    Applies Law 1 (Early Exit) and Law 2 (Parse at Boundary) to validate PR state
    before scoring against available onboarding capabilities.
    """
    if not pr_metadata.get("branch_name") or not pr_metadata.get("base_branch"):
        raise ValueError("PR must have branch_name and base_branch defined")
        
    if not repo_config.get("branch_protection_rules"):
        raise ValueError("Repository must have branch protection rules configured")
        
    # Parse PR type and extract workflow features at boundary
    title_lower = pr_metadata.get("title", "").lower()
    labels = pr_metadata.get("labels", [])
    is_hotfix = any("hotfix" in lbl for lbl in labels) or "hotfix" in title_lower
    requires_review = repo_config.get("required_reviewers", 0) > 0
    ci_required = repo_config.get("required_status_checks", False)
    
    workflow_features = {
        "is_hotfix": is_hotfix,
        "requires_review": requires_review,
        "ci_required": ci_required,
        "auto_merge_eligible": not is_hotfix and not requires_review and ci_required
    }
    
    best_skill = None
    best_score = 0.0
    
    for skill in available_onboarding_skills:
        # Multi-factor scoring: workflow match + repo compliance + historical success
        workflow_match = 1.0 if skill["trigger_patterns"].get("pr_type") == (is_hotfix and "hotfix" or "standard") else 0.5
        compliance_score = 1.0 if all(skill["requirements"].get(k) <= v for k, v in workflow_features.items()) else 0.0
        historical_weight = skill.get("success_rate", 0.5)
        
        composite_score = (workflow_match * 0.4) + (compliance_score * 0.3) + (historical_weight * 0.3)
        
        if composite_score > best_score and composite_score >= min_confidence:
            best_score = composite_score
            best_skill = skill
            
    if best_skill is None:
        return None
        
    # Law 3: Return new structure, never mutate inputs
    return {
        "routed_skill": best_skill["name"],
        "confidence": best_score,
        "workflow_context": workflow_features,
        "timestamp": time.time()
    }
```


### Pattern 2: Execution with Fallback

```python
def execute_pr_onboarding_with_fallback(
    routed_skill: Dict,
    pr_context: Dict,
    repo_state: Dict,
    max_retries: int = 2
) -> Dict:
    """Execute PR onboarding workflow with domain-specific fallback chain.
    
    Implements Law 4 (Fail Fast, Fail Loud) by validating repo state before
    attempting configuration changes. Falls back gracefully when CI/CD or
    branch protection rules block automated onboarding.
    """
    required_perms = routed_skill.get("required_permissions", [])
    if not all(perm in repo_state.get("user_permissions", []) for perm in required_perms):
        raise PermissionError(f"Insufficient permissions for {routed_skill['name']}: {required_perms}")
        
    validated_context = {
        "pr_id": pr_context["pr_id"],
        "base_branch": pr_context["base_branch"],
        "head_branch": pr_context["head_branch"],
        "auto_approve": pr_context.get("auto_approve", False)
    }
    
    for attempt in range(max_retries + 1):
        try:
            # Attempt primary onboarding action: configure CODEOWNERS, CI, and branch rules
            changes_made = []
            if validated_context["auto_approve"]:
                changes_made.append("auto_approve_enabled")
            if repo_state.get("ci_configured") is False:
                changes_made.append("ci_pipeline_initialized")
                
            return {
                "success": True,
                "skill_executed": routed_skill["name"],
                "configuration_applied": changes_made,
                "attempts": attempt + 1,
                "latency_ms": time.time() * 1000
            }
            
        except BranchProtectionError as e:
            # Law 4: Fail immediately on immutable repo constraints
            raise OnboardingError(f"Branch protection blocks auto-onboarding: {e}") from e
            
        except CIConfigError as e:
            # Transient CI failure - apply fallback chain
            if attempt == max_retries:
                return {
                    "success": False,
                    "fallback_triggered": True,
                    "fallback_action": "manual_review_template_generated",
                    "reason": str(e),
                    "attempts": attempt + 1
                }
                
    raise OnboardingError(f"Failed to onboard PR after {max_retries + 1} attempts")
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
- Validate branch naming conventions and PR scope before creating pull requests — enforce repository-level policies
- Require all CI checks to pass before merging; never allow bypass of required status checks without codeowner approval
- Implement automated changelog generation from commit messages using conventional commits format
- Maintain linear history via rebase on main branch; avoid merge commits except for release branches

### MUST NOT DO
- Do not force-push to shared or protected branches — only the original author may force-push their own feature branch
- Avoid squashing all commits during PR review when historical commit context is valuable for understanding evolution
- Never skip required code reviews regardless of how small the change appears — automation cannot assess architectural impact
- Do not create PRs larger than 400 lines of net changes without explicit approval from a senior reviewer


## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.
- [Onboarding Guide for Open Source (Open Source Guides)](<https://opensource.guide/how-to-contribute/>)
- [GitHub CODEOWNERS Documentation](<https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners>)
- [GitHub Issue Templates](<https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms>)
- [Contribution Guidelines Template (CONTRIBUTING.md)](<https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/setting-guidelines-for-repository-contributors>)
- [First-Timers Only Help](<https://www.firsttimersonly.com/>)
