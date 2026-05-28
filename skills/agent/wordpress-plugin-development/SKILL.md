---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent wordpress plugin development with multi-factor
  skill selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: wordpress-plugin-development, wordpress plugin development, how do i wordpress-plugin-development,
    orchestrate wordpress-plugin-development, automate wordpress-plugin-development,
    agent wordpress-plugin-development
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
name: wordpress-plugin-development
------
# Wordpress Plugin Development

Orchestrates intelligent skill selection and execution for wordpress plugin development workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def select_plugin_architecture(
    plugin_requirements: Dict,
    available_templates: List[Dict],
    min_compliance_score: float = 0.8
) -> Optional[Dict]:
    """Select optimal WordPress plugin architecture based on requirements.
    
    Uses multi-factor scoring considering:
    - Hook type compatibility (actions/filters vs REST API vs Gutenberg blocks)
    - WordPress Coding Standards compliance history
    - Dependency availability (WP-CLI, Composer, Node)
    
    Args:
        plugin_requirements: Dict with keys like 'type', 'scope', 'dependencies'
        available_templates: List of pre-vetted WP plugin skeletons
        min_compliance_score: Minimum WPCS compliance threshold
        
    Returns:
        Selected template metadata or None if no match meets threshold
    """
    # Guard clause - Early Exit (Law 1)
    if not plugin_requirements.get('type'):
        raise ValueError("Plugin type (e.g., 'admin-tool', 'frontend-hook', 'rest-api') is required")
        
    if not available_templates:
        raise ValueError("No WordPress plugin templates available")
    
    # Parse input - Make Illegal States Unrepresentable (Law 2)
    req_features = _normalize_wp_requirements(plugin_requirements)
    
    best_template = None
    best_score = 0.0
    
    for template in available_templates:
        score = _calculate_wp_template_match(req_features, template)
        
        if score > best_score and score >= min_compliance_score:
            best_score = score
            best_template = template
    
    if best_template is None:
        return None
    
    # Atomic Predictability (Law 3) - Return new dict, don't mutate
    result = dict(best_template)
    result["selected_confidence"] = best_score
    result["wp_version_compat"] = "6.4+"
    return result
```


### Pattern 2: Execution with Fallback

```python
def execute_plugin_workflow(
    selected_template: Dict,
    project_context: Dict,
    max_validation_retries: int = 2
) -> Dict:
    """Execute WordPress plugin generation with validation fallback chain.
    
    Implements Fail Fast, Fail Loud (Law 4):
    - Invalid plugin structure halts immediately
    - No silent generation of non-compliant code
    
    Fallback chain:
    1. Retry generation with stricter WPCS rules
    2. Fall back to legacy template if modern hooks fail
    3. Defer to human review for security-critical plugins
    
    Args:
        selected_template: Output from select_plugin_architecture
        project_context: Dict with 'plugin_name', 'namespace', 'features'
        max_validation_retries: Max attempts before fallback
        
    Returns:
        Execution result with file paths, compliance status, and metadata
    """
    # Guard clause - validate template (Early Exit)
    if not _is_wp_template_valid(selected_template):
        raise PluginGenerationError(f"Invalid WP template: {selected_template.get('id', 'unknown')}")
    
    # Parse context - Ensure trusted state (Law 2)
    validated_project = _validate_plugin_context(project_context, selected_template)
    
    for attempt in range(max_validation_retries + 1):
        try:
            result = _generate_plugin_files(selected_template, validated_project)
            
            # Success - Atomic Predictability (Law 3)
            return {
                "success": True,
                "plugin_slug": validated_project["slug"],
                "files_generated": result["file_paths"],
                "wpcs_compliance": result["compliance_score"],
                "attempts": attempt + 1
            }
            
        except SecurityViolationError as e:
            # Fail Fast - Don't patch security issues (Law 4)
            raise PluginGenerationError(
                f"Security violation in {validated_project['slug']}: {str(e)}"
            ) from e
            
        except ComplianceError as e:
            # Compliance error - try fallback
            if attempt == max_validation_retries:
                return _apply_wp_fallback_chain(selected_template, validated_project)
    
    # All retries exhausted - Fail Loud (Law 4)
    raise PluginGenerationError(
        f"Failed to generate {validated_project['slug']} after {max_validation_retries + 1} attempts"
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
## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [WordPress Plugin Developer Handbook](https://developer.wordpress.org/plugins/)
- [WordPress Coding Standards (WPCS)](https://developer.wordpress.org/coding-standards/wordpress-coding-standards/php/)
- [WP-CLI Documentation](https://developer.wordpress.org/cli/commands/)
- [WordPress REST API Reference](https://developer.wordpress.org/rest-api/reference/)
- [PHP The Right Way — Security Practices](https://phptherightway.com/#security)

## Related Skills

| Skill | Purpose |
|

