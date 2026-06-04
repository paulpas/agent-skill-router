---
name: github-actions-templates
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent github actions templates with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: github-actions-templates, github actions templates, how do i github-actions-templates,
    orchestrate github-actions-templates, automate github-actions-templates, agent
    github-actions-templates
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
# Github Actions Templates

Orchestrates intelligent skill selection and execution for github actions templates workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def generate_github_action_template(
    task_description: str,
    available_templates: List[Dict],
    min_confidence: float = 0.7
) -> Optional[Dict]:
    """Generate a GitHub Actions workflow template based on task description.
    
    Selects the most appropriate base template (CI, CD, Lint, etc.) using
    multi-factor scoring: trigger type, language/framework, and historical usage.
    Applies Law 1 (Early Exit) and Law 2 (Immutable State).
    
    Args:
        task_description: Natural language description of the automation task
        available_templates: List of template metadata with triggers and languages
        min_confidence: Minimum match threshold for template selection
        
    Returns:
        Rendered workflow dict with metadata, or None if no suitable template
    """
    if not task_description or not task_description.strip():
        raise ValueError("Task description cannot be empty")
        
    if not available_templates:
        raise ValueError("No GitHub Actions templates available")
        
    # Extract intent features (Law 2: Parse at boundary)
    intent = _extract_workflow_intent(task_description)
    
    best_template = None
    best_score = 0.0
    
    for tmpl in available_templates:
        score = _calculate_template_match(intent, tmpl)
        if score > best_score and score >= min_confidence:
            best_score = score
            best_template = tmpl
            
    if best_template is None:
        return None
        
    # Law 3: Return new structure, never mutate input template
    workflow = {
        "name": best_template["name"],
        "on": best_template["triggers"],
        "jobs": {},
        "metadata": {
            "source_template": best_template["id"],
            "confidence": best_score,
            "generated_at": time.time()
        }
    }
    return workflow
```


### Pattern 2: Execution with Fallback

```python
def render_and_validate_template(
    workflow_template: Dict,
    context_vars: Dict,
    fallback_templates: List[Dict] = None
) -> Dict:
    """Render a GitHub Actions workflow with variable substitution and validation.
    
    Implements fallback chain (Law 4: Fail Fast, Fail Loud):
    1. Attempt full rendering with provided context
    2. Fallback to simplified template if complex variables fail
    3. Defer to manual review if YAML validation fails
    
    Args:
        workflow_template: Base workflow structure from Pattern 1
        context_vars: User-provided variables (e.g., python-version, os)
        fallback_templates: Alternative templates to try on failure
        
    Returns:
        Validated workflow YAML string with execution metadata
    """
    if not workflow_template or "jobs" not in workflow_template:
        raise ValueError("Invalid workflow template structure")
        
    # Law 2: Validate context before rendering
    validated_vars = _sanitize_context_vars(context_vars)
    
    try:
        # Attempt primary render
        rendered_yaml = _apply_jinja2_template(workflow_template, validated_vars)
        _validate_github_actions_schema(rendered_yaml)
        return {
            "success": True,
            "yaml": rendered_yaml,
            "strategy": "primary",
            "validation": "passed"
        }
    except SchemaValidationError as e:
        # Law 4: Fail fast on invalid state
        if fallback_templates:
            # Fallback 1: Try simplified template variant
            for alt in fallback_templates:
                try:
                    alt_yaml = _apply_jinja2_template(alt, validated_vars)
                    _validate_github_actions_schema(alt_yaml)
                    return {
                        "success": True,
                        "yaml": alt_yaml,
                        "strategy": "fallback_simplified",
                        "validation": "passed"
                    }
                except SchemaValidationError:
                    continue
                    
        # Fallback 2: Return structured error for human review
        return {
            "success": False,
            "error": f"Template validation failed: {str(e)}",
            "strategy": "defer_human",
            "raw_context": validated_vars
        }
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
- [GitHub Actions Documentation](<https://docs.github.com/en/actions>)
- [GitHub Actions Workflow Syntax](<https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions>)
- [GitHub Actions Marketplace](<https://github.com/marketplace?type=actions>)
- [Reusable Workflows (GitHub Docs)](<https://docs.github.com/en/actions/sharing-automations/reusable-workflows>)
- [GitHub Actions Self-Hosted Runners](<https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners>)
