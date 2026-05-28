---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent skill creator ms with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: skill-creator-ms, skill creator ms, how do i skill-creator-ms, orchestrate
    skill-creator-ms, automate skill-creator-ms, agent skill-creator-ms
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
name: skill-creator-ms
------
# Skill Creator Ms

Orchestrates intelligent skill selection and execution for skill creator ms workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def build_skill_definition(
    request: str,
    registry: List[Dict],
    schema_version: str = "v2"
) -> Dict:
    """Construct a validated skill manifest from a natural language request.
    
    Domain logic: Parses intent, maps to existing registry patterns,
    resolves dependencies, and generates a structured skill definition
    ready for deployment.
    """
    if not request or not registry:
        raise ValueError("Request and registry are required for skill creation")
        
    # Extract core components using domain-specific NLP pipeline
    intent = _parse_intent(request)
    triggers = _extract_triggers(request, intent)
    actions = _resolve_actions(request, registry)
    
    # Validate against skill schema and check for conflicts
    manifest = {
        "name": f"skill-{intent['entity']}-{intent['action']}",
        "version": "1.0.0",
        "schema": schema_version,
        "triggers": triggers,
        "actions": actions,
        "dependencies": _resolve_dependencies(actions, registry),
        "confidence": _calculate_creation_confidence(intent, registry)
    }
    
    # Enforce schema constraints before returning
    _validate_manifest_against_schema(manifest, schema_version)
    return manifest
```


### Pattern 2: Execution with Fallback

```python
def execute_skill_creation_pipeline(
    manifest: Dict,
    registry_client: object,
    fallback_mode: str = "template"
) -> Dict:
    """Execute the skill creation workflow with domain-specific fallbacks.
    
    Handles code generation, syntax validation, registry publishing,
    and automatic fallback to template-based generation if custom
    generation fails.
    """
    try:
        # Generate skill implementation code
        code = _generate_skill_code(manifest)
        
        # Validate generated code against domain rules
        validation = _validate_skill_implementation(code, manifest["triggers"])
        if not validation["passed"]:
            raise SkillValidationError(validation["errors"])
            
        # Publish to skill registry
        registry_client.publish(manifest["name"], code, manifest["version"])
        
        return {
            "status": "created",
            "skill_id": manifest["name"],
            "registry_url": registry_client.get_url(manifest["name"]),
            "validation_passed": True
        }
        
    except SkillValidationError as e:
        # Fallback 1: Attempt template-based generation
        if fallback_mode == "template":
            template_code = _apply_skill_template(manifest)
            registry_client.publish(manifest["name"], template_code, manifest["version"])
            return {"status": "created_via_template", "skill_id": manifest["name"]}
            
        # Fallback 2: Queue for manual review
        return {"status": "deferred", "reason": str(e), "skill_id": manifest["name"]}
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
| `skill-creator` | The core skill creation workflow — this variant adds Microsoft-specific guidance |
| `skill-documentation-best-practices` | Provides documentation patterns that complement the skill creator workflow |

## Live References

> Authoritative documentation links for this domain. The model follows markdown links at load time to resolve external references and inline content.

- [Microsoft Learn Documentation Standards](https://learn.microsoft.com/en-us/contribute/content/doc-contribute-guide) — Microsoft's guidelines for writing technical documentation and skill-like learning modules
- [Azure AI Agent Framework Documentation](https://learn.microsoft.com/en-us/azure/ai-services/) — Official Azure AI services documentation for building agentic workflows
- [OpenAI Function Calling Specification](https://platform.openai.com/docs/guides/function-calling) — OpenAI's documentation on defining and calling external functions from GPT models
- [Anthropic Tool Use Documentation](https://docs.anthropic.com/en/docs/build-with-claude/tool-use) — Anthropic's guide to tool use patterns for Claude-based agents
- [LangChain Tool Definition Patterns](https://python.langchain.com/docs/modules/agents/tools/) — LangChain documentation on defining, registering, and composing tools for AI agents