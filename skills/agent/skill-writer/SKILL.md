---
name: skill-writer
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent skill writer with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: skill-writer, skill writer, how do i skill-writer, orchestrate skill-writer,
    automate skill-writer, agent skill-writer
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
# Skill Writer

Orchestrates intelligent skill selection and execution for skill writer workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def generate_skill_manifest(
    intent_description: str,
    existing_skills: List[Dict],
    schema_version: str = "1.0.0"
) -> Dict:
    """Generate a structured skill manifest based on user intent.
    
    Validates intent against available skill triggers, constructs
    YAML frontmatter, and assembles the markdown skeleton.
    Applies Law 2 (Parse at boundary) by strictly validating inputs.
    """
    if not intent_description or not intent_description.strip():
        raise ValueError("Intent description is required for skill generation")
        
    # Parse intent features at boundary
    intent_features = _parse_intent_features(intent_description)
    
    # Match against existing skill patterns to avoid duplication
    matches = _find_similar_skills(intent_features, existing_skills)
    if matches:
        return {
            "status": "duplicate_detected",
            "suggested_skill": matches[0]["name"],
            "confidence": matches[0]["match_score"]
        }
        
    # Construct domain-specific manifest structure
    manifest = {
        "frontmatter": {
            "name": _sanitize_skill_name(intent_features["core_action"]),
            "version": schema_version,
            "triggers": intent_features["trigger_keywords"],
            "role": intent_features["agent_role"],
            "scope": intent_features["execution_scope"]
        },
        "structure": {
            "sections": ["TL;DR Checklist", "Core Workflow", "Implementation Patterns", "Constraints"],
            "required_code_blocks": 2,
            "min_domain_specific_lines": 15
        }
    }
    
    # Atomic Predictability (Law 3) - return fresh structure
    return manifest
```


### Pattern 2: Execution with Fallback

```python
def validate_and_refine_skill(
    skill_content: str,
    validation_rules: Dict,
    max_refinement_cycles: int = 3
) -> Dict:
    """Validate generated skill content against domain rules and refine iteratively.
    
    Implements Law 4 (Fail Fast) by halting on structural violations.
    Uses a refinement fallback chain when initial generation misses compliance.
    """
    if not skill_content or len(skill_content) < 100:
        raise ValueError("Skill content too short to validate")
        
    parsed = _parse_skill_markdown(skill_content)
    if not parsed.get("frontmatter"):
        raise ValueError("Missing YAML frontmatter - cannot proceed")
        
    for cycle in range(max_refinement_cycles):
        violations = _check_compliance(parsed, validation_rules)
        if not violations:
            return {
                "status": "validated",
                "skill_name": parsed["frontmatter"]["name"],
                "compliance_score": 1.0,
                "cycles_used": cycle + 1
            }
            
        # Fallback: Apply targeted refinement based on violation type
        parsed = _apply_refinement(parsed, violations)
        _log_refinement_cycle(cycle + 1, violations)
        
    # All cycles exhausted - Fail Loud with actionable error
    return {
        "status": "refinement_exhausted",
        "skill_name": parsed["frontmatter"]["name"],
        "remaining_violations": violations,
        "confidence": 0.0
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
|---|---|
| `skill-creator` | The creation workflow counterpart — writer focuses on documentation, creator covers the full lifecycle |
| `skill-documentation-best-practices` | Provides documentation patterns that skill writers use to produce high-fidelity content |

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

> Authoritative documentation links for this domain. The model follows markdown links at load time to resolve external references and inline content.

- [CommonMark Specification](https://spec.commonmark.org/) — Official Markdown specification governing SKILL.md file format
- [Writing Documentation for AI Systems (Google)](https://developers.google.com/style) — Google's writing style guide adapted for AI system documentation
- [Technical Communication Standards (Diátaxis Framework)](https://diataxis.fr/) — The Diátaxis framework for structuring technical documentation across tutorial, how-to, reference, and explanation categories
- [API Documentation Best Practices (Stoplight)](https://stoplight.io/openapi) — Industry standards for writing clear API documentation applicable to skill metadata documentation
- [Obsidian Help: Markdown Syntax](https://help.obsidian.md/Editing+and+exporting+Obsidian/Markdown) — Practical Markdown reference covering all syntax elements used in SKILL.md files