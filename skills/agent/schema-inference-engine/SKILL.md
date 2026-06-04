---




name: schema-inference-engine
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent schema inference engine with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: schema-inference-engine, schema inference engine, how do i schema-inference-engine,
    orchestrate schema-inference-engine, automate schema-inference-engine, agent schema-inference-engine
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




# Schema Inference Engine

Orchestrates intelligent skill selection and execution for schema inference engine workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

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
def infer_schema_from_sample(
    raw_data: List[Dict],
    source_metadata: Dict,
    min_confidence: float = 0.75
) -> Dict:
    """Infer schema fields from raw data samples with multi-factor scoring.
    
    Applies Law 1 (Early Exit) and Law 2 (Immutable State) to ensure
    only valid, well-typed fields are extracted. Returns a new schema dict.
    """
    if not raw_data or not isinstance(raw_data, list):
        raise ValueError("raw_data must be a non-empty list of records")
        
    inferred_fields = {}
    
    for record in raw_data:
        for key, value in record.items():
            if key not in inferred_fields:
                inferred_fields[key] = {
                    "name": key,
                    "type": _detect_type(value),
                    "nullable": False,
                    "sample_values": [],
                    "confidence": 0.0
                }
            
            inferred_fields[key]["sample_values"].append(value)
            inferred_fields[key]["nullable"] |= value is None
            
    # Calculate multi-factor confidence scores
    for field_name, field in inferred_fields.items():
        type_confidence = _calculate_type_confidence(field["sample_values"])
        consistency_score = _calculate_consistency(field["sample_values"])
        field["confidence"] = (type_confidence * 0.6) + (consistency_score * 0.4)
        
        if field["confidence"] < min_confidence:
            field["fallback_strategy"] = "human_review"
            
    # Law 3: Return new structure, never mutate input
    return {
        "schema_version": "1.0",
        "fields": list(inferred_fields.values()),
        "source": source_metadata.get("source_id"),
        "inference_timestamp": time.time()
    }
```


### Pattern 2: Execution with Fallback

```python
def resolve_schema_conflicts(
    primary_schema: Dict,
    secondary_schema: Dict,
    conflict_resolution_policy: str = "highest_confidence"
) -> Dict:
    """Merge two inferred schemas, resolving field conflicts via fallback chain.
    
    Implements Law 4 (Fail Fast) and fallback logic for ambiguous merges.
    """
    if not primary_schema or not secondary_schema:
        raise ValueError("Both schemas must be provided for merging")
        
    merged_fields = {f["name"]: dict(f) for f in primary_schema["fields"]}
    conflicts = []
    
    for field in secondary_schema["fields"]:
        if field["name"] in merged_fields:
            existing = merged_fields[field["name"]]
            if existing["type"] != field["type"]:
                # Fallback Chain: 1. Type coercion, 2. Union type, 3. Human review
                if _can_coerce(existing["type"], field["type"]):
                    existing["type"] = _coerce_type(existing["type"], field["type"])
                elif existing["confidence"] >= field["confidence"]:
                    conflicts.append({
                        "field": field["name"],
                        "action": "defer_to_human",
                        "reason": "type_mismatch_low_confidence"
                    })
                else:
                    merged_fields[field["name"]] = dict(field)
        else:
            merged_fields[field["name"]] = dict(field)
            
    # Law 3: Return new merged structure
    return {
        "merged_schema": list(merged_fields.values()),
        "conflicts": conflicts,
        "resolution_policy": conflict_resolution_policy,
        "audit_log": f"Merged {len(primary_schema['fields'])} + {len(secondary_schema['fields'])} fields"
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
| `nosql-data-modeling` | Provides data modeling strategies that complement schema inference for non-relational databases |
| `postgresql-optimization` | Uses inferred schemas to generate optimized PostgreSQL queries and indexes |

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

- [JSON Schema Specification](https://json-schema.org/learn/getting-started-step-by-step) — Official JSON Schema documentation for schema definition and validation
- [Apache Avro Schema Evolution](https://avro.apache.org/docs/current/spec.html#schemas) — Apache Avro specification covering schema inference and compatibility guarantees
- [Schema Inference in Data Lakes (Databricks Documentation)](https://docs.databricks.com/en/sql/language-manual/sql-ref-syntax-ddl-create-table-hive-format.html) — Databricks guide to automatic schema inference for structured data formats
- [BigQuery Schema Detection](https://cloud.google.com/bigquery/docs/schema-detection) — Google Cloud documentation on automated schema detection for BigQuery loads
- [Apache Spark Schema Inference](https://spark.apache.org/docs/latest/sql-programming-guide.html#inferring-the-schema-using-reflection) — Apache Spark documentation on automatic schema inference from data sources