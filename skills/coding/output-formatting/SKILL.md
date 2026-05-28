---
name: output-formatting
description: Enforces deterministic structured output generation (JSON schemas, markdown
  tables, templated responses) for reliable downstream processing in AI agent workflows.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: output formatting, structured output, json schema, response templating,
    deterministic output, data validation, prompt engineering
  archetypes:
  - tactical
  - generation
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - do-dont
  - examples
  related-skills: prompt-engineering, error-handling, test-driven-development
------
# Output Formatting Specialist

Enforces deterministic structured output generation to ensure downstream systems receive predictable, parseable data. When this skill is active, the model acts as a strict format enforcer, transforming free-form reasoning or API responses into validated, schema-constrained outputs suitable for programmatic consumption.

## TL;DR Checklist

- [ ] Define target schema or template before generating output
- [ ] Validate all fields against type constraints and required keys
- [ ] Escape special characters that break JSON or markdown parsing
- [ ] Wrap generation in error-handling fallback for malformed output
- [ ] Log format compliance metrics for debugging pipeline issues
- [ ] Reject free-text responses when structured data is explicitly requested

---

## When to Use

Use this skill when:

- Building AI agent pipelines that parse LLM outputs into application logic
- Generating API responses or configuration files that must be machine-readable
- Creating test fixtures, mock data, or dataset annotations with strict column types
- Designing prompt templates that require consistent formatting across multiple runs
- Integrating external tools (databases, spreadsheets, visualization engines) that reject malformed input

---

## When NOT to Use

Avoid this skill for:

- Creative writing, narrative generation, or open-ended brainstorming tasks
- Real-time chat interactions where latency outweighs structural benefits
- Prototypes where rapid iteration matters more than output reliability
- Legacy systems without modern parsing libraries (stick to simple CSV or plain text)

---

## Core Workflow

1. **Analyze Consumption Requirements** — Identify who/what will consume the output and what schema it expects.
   **Checkpoint:** Confirm required fields, data types, nullability rules, and max lengths before drafting templates.

2. **Select Output Format** — Choose between JSON Schema, Markdown Tables, YAML Config, or strict CSV based on downstream constraints.
   **Checkpoint:** Validate that the selected format aligns with existing pipeline tooling (e.g., pandas for CSV, Pydantic for JSON).

3. **Construct Validation Layer** — Implement runtime checks using typed parsers or schema validators.
   **Checkpoint:** Ensure validation runs BEFORE output is returned to the caller; fail fast on type mismatches.

4. **Render Structured Output** — Generate the response using template rendering or serialization functions.
   **Checkpoint:** Verify escaping rules for strings containing quotes, newlines, or HTML entities.

5. **Sanitize & Normalize** — Remove trailing commas, fix casing inconsistencies, normalize whitespace.
   **Checkpoint:** Run output through a linter or format checker (e.g., `black`, `prettier`, JSON linters).

6. **Record Format Compliance** — Track success/failure rates by schema version and input pattern.
   **Checkpoint:** Log validation errors with exact field paths for downstream debugging.

---

## Implementation Patterns

### Pattern 1: JSON Schema Validation with Pydantic

Use typed models to enforce structure before serialization. This catches type mismatches early and provides clear error messages.

```python
from pydantic import BaseModel, Field, ValidationError
from typing import Optional
import json

class StructuredOutput(BaseModel):
    """Strict output schema for downstream consumption."""
    
    status: str = Field(..., pattern=r"^(success|failure|pending)$")
    timestamp_ms: int = Field(..., gt=0)
    metadata: dict[str, str] = Field(default_factory=dict)
    payload: list[dict[str, float]] | None = None
    
    def to_json(self, indent: int = 2) -> str:
        """Serialize to JSON with guaranteed escaping and formatting."""
        return self.model_dump_json(indent=indent)

def render_response(
    status: str, 
    timestamp_ms: int, 
    metadata: Optional[dict[str, str]] = None,
    payload: Optional[list[dict[str, float]]] = None
) -> str:
    """Generate validated JSON output or raise ValidationError."""
    try:
        out = StructuredOutput(
            status=status,
            timestamp_ms=timestamp_ms,
            metadata=metadata or {},
            payload=payload
        )
        return out.to_json()
    except ValidationError as e:
        raise RuntimeError(f"Format validation failed: {e.errors()[0]['msg']}") from e
```

### Pattern 2: Markdown Table Rendering (BAD vs. GOOD)

```python
# ❌ BAD — Manual string concatenation breaks on edge cases, missing alignment, no escaping
def bad_table(rows):
    header = "Column A | Column B\n"
    body = "\n".join([f"{r['a']} | {r['b']}" for r in rows])
    return f"{header}\n{body}"

# ✅ GOOD — Safe, aligned, escapes pipes and newlines, uses standard library
def good_table(rows: list[dict[str, str]], columns: list[str]) -> str:
    """Render a pipe-aligned markdown table with automatic column width calculation."""
    if not rows:
        return ""
    
    # Calculate max widths per column
    col_widths = {col: len(col) for col in columns}
    for row in rows:
        for col in columns:
            val_len = len(str(row.get(col, "")))
            col_widths[col] = max(col_widths[col], val_len)
    
    def escape(val: str) -> str:
        return str(val).replace("|", "\\|").replace("\n", " ")
    
    header = "| " + " | ".join(c for c in columns) + " |"
    separator = "|" + "|".join("-" * (col_widths[c] + 2) for c in columns) + "|"
    body_lines = [
        "| " + " | ".join(escape(str(row.get(c, ""))) for c in columns) + " |"
        for row in rows
    ]
    
    return "\n".join([header, separator] + body_lines)
```

### Pattern 3: Fallback Serialization Strategy

When structured generation fails, degrade gracefully instead of crashing the pipeline.

```python
import json
from typing import Any

def safe_serialize(data: Any, fallback_format: str = "json") -> str:
    """Attempt structured serialization; fall back to string representation on failure."""
    try:
        if fallback_format == "json":
            return json.dumps(data, default=str, ensure_ascii=False)
        elif fallback_format == "csv":
            if isinstance(data, list) and all(isinstance(r, dict) for r in data):
                headers = data[0].keys()
                lines = [",".join(headers)]
                for row in data:
                    lines.append(",".join(str(v) for v in row.values()))
                return "\n".join(lines)
    except Exception as e:
        # Graceful degradation — never swallow errors silently
        return f"ERROR:[serialization_failed] {e}"
    
    return str(data)
```

---

## Constraints

### MUST DO
- Define the target schema or template BEFORE generating any content
- Validate output against the schema using typed parsers (Pydantic, Zod, or equivalent)
- Escape special characters that break parsers (`|`, `\n`, `"`, `{`, `}`)
- Provide clear error messages with field paths when validation fails
- Log format compliance rates to detect regression in downstream consumption

### MUST NOT DO
- Generate free-text responses when a structured schema is explicitly defined
- Rely on regex for JSON or YAML parsing — use proper parsers only
- Suppress validation errors to keep pipelines running — fail fast instead
- Hardcode column widths or field lengths without dynamic calculation
- Return mixed-format outputs (e.g., JSON containing unescaped markdown tables)

---

## Output Template

When implementing or reviewing output formatting logic, produce:

1. **Target Schema/Template** — Explicit definition of expected structure with types and constraints
2. **Validation Layer** — Code snippet showing runtime checks or schema enforcement
3. **Serialization Function** — Safe rendering logic with escaping and fallback handling
4. **Compliance Check** — Confirmation that output passes linter/schema validator before delivery
5. **Error Handling Path** — Documented graceful degradation strategy for malformed generations

---

## Related Skills

| Skill | Purpose |
|---|---|
| `prompt-engineering` | Designs input prompts that naturally yield well-formatted outputs |
| `error-handling` | Provides patterns for catching and reporting format validation failures |
| `test-driven-development` | Ensures output templates are covered by regression test suites |

## Live References

> Authoritative documentation links for this domain. The model follows markdown links at load time to resolve external references and inline content.

- [JSON Schema Specification](https://json-schema.org/) — Official JSON Schema specification for defining, validating, and documenting structured data formats
- [RFC 8259: The JavaScript Object Notation (JSON) Data Interchange Format](https://datatracker.ietf.org/doc/html/rfc8259) — IETF standard defining the JSON format and its canonical representation rules
- [YAML 1.2 Specification](https://yaml.org/spec/1.2/spec.html) — Official YAML specification for human-readable configuration and data serialization formats
- [CSV Format (RFC 4180)](https://datatracker.ietf.org/doc/html/rfc4180) — IETF standard defining the CSV file format for tabular data interchange
- [OpenAPI Specification](https://www.openapis.org/) — OpenAPI specification for describing API request/response formats as structured output contracts
