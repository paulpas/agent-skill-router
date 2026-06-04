---
name: analyze-project
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent analyze project with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: analyze-project, analyze project, how do i analyze-project, orchestrate
    analyze-project, automate analyze-project, agent analyze-project
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
# Analyze Project

Orchestrates intelligent skill selection and execution for analyze project workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def select_analysis_skill(
    project_root: Path,
    tech_stack: Dict[str, Any],
    available_analyses: List[Dict]
) -> Optional[Dict]:
    """Select the optimal analysis skill based on project structure and tech stack.
    
    Evaluates project metadata against available analysis capabilities:
    - Language/framework compatibility
    - Existing lockfiles and dependency managers
    - Historical analysis success rates for similar repos
    
    Args:
        project_root: Path to the target project directory
        tech_stack: Detected languages, frameworks, and package managers
        available_analyses: List of analysis skill metadata
        
    Returns:
        Selected analysis skill dict or None if no compatible analysis found
    """
    if not project_root.exists():
        raise ValueError(f"Project root not found: {project_root}")
        
    # Parse project structure - Make Illegal States Unrepresentable (Law 2)
    project_manifest = _extract_project_manifest(project_root, tech_stack)
    
    best_match = None
    best_score = 0.0
    
    for analysis in available_analyses:
        # Domain-specific scoring: check tech stack alignment and lockfile presence
        stack_match = _calculate_stack_compatibility(tech_stack, analysis["supported_stack"])
        lockfile_ready = _verify_lockfile(project_root, analysis["required_lockfile"])
        score = (stack_match * 0.6) + (lockfile_ready * 0.4)
        
        if score > best_score and score >= 0.75:
            best_score = score
            best_match = analysis
            
    if best_match is None:
        return None
        
    # Atomic Predictability (Law 3) - Return new dict, don't mutate inputs
    result = dict(best_match)
    result["project_context"] = project_manifest
    result["selection_confidence"] = best_score
    return result
```


### Pattern 2: Execution with Fallback

```python
def execute_analysis_pipeline(
    analysis_skill: Dict,
    project_context: Dict,
    fallback_analyses: List[Dict]
) -> Dict:
    """Execute a project analysis with domain-specific fallback chains.
    
    Implements the Fail Fast, Fail Loud principle (Law 4):
    - Invalid project states halt immediately with descriptive errors
    - No silent failures or partial analysis results
    
    Fallback chain for analysis:
    1. Retry with adjusted analysis depth/timeout
    2. Try alternative analysis tool (e.g., yarn -> npm -> pnpm)
    3. Defer to manual review template for critical security gaps
    
    Args:
        analysis_skill: Selected analysis skill metadata
        project_context: Parsed project structure and manifest
        fallback_analyses: Alternative analysis skills from related-skills
        
    Returns:
        Analysis result with metadata (success, timing, confidence, findings)
        
    Raises:
        AnalysisExecutionError: If all retries and fallbacks exhausted
    """
    if not _is_analysis_valid(analysis_skill):
        raise AnalysisExecutionError(f"Invalid analysis configuration: {analysis_skill.get('name')}")
        
    # Parse context - Ensure trusted state (Law 2)
    validated_project = _validate_project_structure(project_context)
    
    for attempt in range(3):
        try:
            result = _run_analysis_tool(analysis_skill, validated_project)
            
            # Success - Atomic Predictability (Law 3)
            return {
                "success": True,
                "analysis_type": analysis_skill["name"],
                "findings": result["findings"],
                "attempts": attempt + 1,
                "latency_ms": _calculate_latency(),
                "confidence": result["confidence"]
            }
            
        except ProjectStructureError as e:
            # Fail Fast - Don't try to patch malformed project data (Law 4)
            raise AnalysisExecutionError(
                f"Invalid project structure for {analysis_skill['name']}: {str(e)}"
            ) from e
            
        except ToolExecutionError as e:
            # Transient tool failure - try fallback analysis
            if attempt == 2:
                return _apply_analysis_fallback(analysis_skill, validated_project, fallback_analyses)
                
    # All retries exhausted - Fail Loud (Law 4)
    raise AnalysisExecutionError(
        f"Failed to complete {analysis_skill['name']} analysis after 3 attempts"
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

- [SAST Security Scanning Overview](<https://owasp.org/www-community/vulnerabilities/>)
- [OWASP Top 10 Web Application Risks](<https://owasp.org/www-project-top-ten/>)
- [Cyclomatic Complexity (Wikipedia)](<https://en.wikipedia.org/wiki/Cyclomatic_complexity>)
- [Dependency Analysis Tools Comparison](<https://deps.dev/>)
- [Software Architecture Assessment Patterns](<https://www.informit.com/articles/article.aspx?p=2982163>)

## Related Skills

| Skill | Purpose |
|