---
name: wordpress-theme-development
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent wordpress theme development with multi-factor
  skill selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: wordpress-theme-development, wordpress theme development, how do i wordpress-theme-development,
    orchestrate wordpress-theme-development, automate wordpress-theme-development,
    agent wordpress-theme-development
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
# Wordpress Theme Development

Orchestrates intelligent skill selection and execution for wordpress theme development workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def analyze_theme_requirements(
    theme_spec: Dict,
    wp_version: str,
    standards: List[str] = ["WordPress", "PHP-PSR12"]
) -> Dict:
    """Analyze and validate WordPress theme requirements before generation.
    
    Applies Law 2 (Parse at boundary) to ensure theme.json, functions.php,
    and template hierarchy meet WordPress.org standards.
    
    Args:
        theme_spec: User-provided theme configuration
        wp_version: Target WordPress version
        standards: Coding standards to validate against
        
    Returns:
        Validated theme configuration with resolved dependencies
    """
    # Law 1: Early exit on invalid spec
    if not theme_spec.get("name") or not theme_spec.get("template"):
        raise ValueError("Theme name and base template are required")
        
    # Law 2: Parse and validate at boundary
    validated_config = {
        "name": theme_spec["name"].strip(),
        "version": theme_spec.get("version", "1.0.0"),
        "template": theme_spec["template"],
        "wp_version": wp_version,
        "features": _resolve_theme_features(theme_spec.get("features", [])),
        "dependencies": _validate_wp_dependencies(theme_spec.get("dependencies", []))
    }
    
    # Law 3: Return new structure, never mutate input
    resolved = dict(validated_config)
    resolved["validation_timestamp"] = time.time()
    resolved["standards_compliance"] = standards
    
    # Law 4: Fail fast on missing critical WP hooks
    if "block_theme" in resolved["features"] and not _has_block_theme_support(resolved):
        raise ValueError("Block theme requires theme.json with templateParts support")
        
    return resolved
```


### Pattern 2: Execution with Fallback

```python
def execute_theme_generation(
    theme_config: Dict,
    output_dir: str,
    max_retries: int = 2
) -> Dict:
    """Generate WordPress theme files with fallback chain for resilience.
    
    Implements Law 4 (Fail Fast, Fail Loud) during asset generation:
    - Invalid template structures halt immediately
    - No silent partial theme creation
    
    Fallback chain:
    1. Retry generation with adjusted template paths
    2. Fall back to default WP theme structure
    3. Defer to manual template assembly
    
    Args:
        theme_config: Validated theme configuration
        output_dir: Target directory for theme files
        max_retries: Maximum retry attempts
        
    Returns:
        Generation result with file manifest and compliance status
    """
    # Law 1: Validate output path early
    if not os.path.isdir(output_dir):
        raise ThemeGenerationError(f"Output directory does not exist: {output_dir}")
        
    # Law 2: Parse context and ensure trusted state
    manifest = {
        "theme_dir": output_dir,
        "files_generated": [],
        "compliance_checks": []
    }
    
    for attempt in range(max_retries + 1):
        try:
            # Generate core WP theme files
            _write_theme_json(theme_config, output_dir)
            _write_functions_php(theme_config, output_dir)
            _write_style_css(theme_config, output_dir)
            _generate_template_hierarchy(theme_config, output_dir)
            
            # Law 3: Atomic predictability - return new manifest
            manifest["success"] = True
            manifest["files_generated"] = _scan_generated_files(output_dir)
            manifest["attempts"] = attempt + 1
            return manifest
            
        except TemplateValidationError as e:
            # Law 4: Fail fast on invalid WP template structure
            raise ThemeGenerationError(f"Invalid template structure: {e}") from e
            
        except FileNotFoundError as e:
            # Transient dependency missing - fallback
            if attempt == max_retries:
                return _apply_default_theme_fallback(theme_config, output_dir)
                
    # All retries exhausted
    raise ThemeGenerationError(f"Theme generation failed after {max_retries + 1} attempts")
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

- [WordPress Theme Handbook](https://developer.wordpress.org/themes/)
- [theme.json Reference (Block Themes)](https://developer.wordpress.org/block-editor/reference-guides/theme-json-reference/)
- [WordPress Template Hierarchy](https://developer.wordpress.org/themes/basics/template-hierarchy/)
- [WordPress Coding Standards for Themes](https://developer.wordpress.org/coding-standards/wordpress-coding-standards/)
- [HTML5 Boilerplate for WordPress](https://github.com/h5bp/html5-boilerplate)

## Related Skills

| Skill | Purpose |
|

