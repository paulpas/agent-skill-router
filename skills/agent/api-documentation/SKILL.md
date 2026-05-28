---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent api documentation with multi-factor skill selection,
  fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: api-documentation, api documentation, how do i api-documentation, orchestrate
    api-documentation, automate api-documentation, agent api-documentation
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
name: api-documentation
------
# Api Documentation

Orchestrates intelligent skill selection and execution for api documentation workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def parse_api_spec_and_extract_endpoints(
    spec_path: str,
    output_format: str = "markdown",
    include_examples: bool = True
) -> Dict[str, Any]:
    """Parse OpenAPI/Swagger specification and extract structured endpoint data.
    
    Implements the 5 Laws of Elegant Defense:
    - Early exit on invalid spec paths or unsupported formats
    - Immutable parsing: spec is never mutated, only read
    - Fail fast on missing required fields (paths, info)
    - Atomic output generation with fallback to default templates
    """
    # Law 1: Early Exit / Guard Clauses
    if not spec_path or not os.path.exists(spec_path):
        raise FileNotFoundError(f"API spec not found: {spec_path}")
        
    if output_format not in ("markdown", "html", "json"):
        raise ValueError(f"Unsupported format: {output_format}. Use markdown, html, or json.")
        
    # Law 2: Parse at boundary, make illegal states unrepresentable
    try:
        with open(spec_path, 'r') as f:
            raw_spec = json.load(f)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in spec file: {e}") from e
        
    # Validate required OpenAPI structure
    if "openapi" not in raw_spec or "paths" not in raw_spec:
        raise ValueError("Spec missing required 'openapi' or 'paths' fields")
        
    # Law 3: Atomic Predictability - Build new structure, never mutate raw_spec
    doc_structure = {
        "title": raw_spec.get("info", {}).get("title", "Untitled API"),
        "version": raw_spec.get("info", {}).get("version", "0.0.0"),
        "endpoints": [],
        "metadata": {
            "format": output_format,
            "generated_at": datetime.now().isoformat(),
            "include_examples": include_examples
        }
    }
    
    # Process endpoints
    for path, methods in raw_spec["paths"].items():
        for method, details in methods.items():
            if method.upper() in ("GET", "POST", "PUT", "DELETE", "PATCH"):
                doc_structure["endpoints"].append({
                    "path": path,
                    "method": method.upper(),
                    "summary": details.get("summary", ""),
                    "parameters": details.get("parameters", []),
                    "responses": details.get("responses", {})
                })
                
    return doc_structure
```


### Pattern 2: Execution with Fallback

```python
def assemble_documentation_with_fallback(
    doc_structure: Dict[str, Any],
    fallback_strategy: str = "auto-generate",
    cache_dir: str = "./doc_cache"
) -> str:
    """Assemble final documentation with resilience patterns for missing data.
    
    Implements fallback chain for missing examples or rendering failures:
    1. Use provided examples if available
    2. Auto-generate stub examples from parameter schemas
    3. Fall back to cached version if external tools fail
    4. Fail loud with clear error if all strategies exhausted
    """
    # Law 1: Validate input structure
    if not doc_structure or "endpoints" not in doc_structure:
        raise ValueError("Invalid doc structure provided for assembly")
        
    rendered_docs = []
    rendered_docs.append(f"# {doc_structure['title']} Documentation\n")
    rendered_docs.append(f"**Version:** {doc_structure['version']}\n")
    
    for ep in doc_structure["endpoints"]:
        # Law 2: Parse/validate endpoint data at boundary
        method = ep["method"]
        path = ep["path"]
        summary = ep.get("summary", f"Auto-generated summary for {method} {path}")
        
        # Fallback Chain: Example Generation
        examples = ep.get("examples", [])
        if not examples and fallback_strategy == "auto-generate":
            # Generate stub from parameters
            examples = _generate_stub_examples(ep.get("parameters", []))
        elif not examples:
            examples = [{"note": "No examples available"}]
            
        # Law 3: Atomic output construction
        section = f"## {method} `{path}`\n\n{summary}\n\n"
        section += "### Parameters\n" + _format_parameters(ep.get("parameters", [])) + "\n"
        section += "### Examples\n" + _format_examples(examples) + "\n"
        rendered_docs.append(section)
        
    final_output = "\n".join(rendered_docs)
    
    # Law 4: Fail loud if output is empty or corrupted
    if not final_output.strip():
        raise RuntimeError("Documentation assembly produced empty output")
        
    return final_output
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
| `api-security-testing` | Security-focused API documentation and testing workflows |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [OpenAPI Specification 3.1](https://spec.openapis.org/oas/v3.1.0)
- [OpenAPI Initiative — What is the Open API Specification?](https://www.openapis.org/what-is-the-open-api-specification)
- [Swagger Editor & Validation](https://editor.swagger.io/)
- [RESTful API Design Guide (Google)](https://cloud.google.com/apis/design)
- [JSON Schema Draft 2020-12 Specification](https://json-schema.org/draft/2020-12/json-schema-core.html)