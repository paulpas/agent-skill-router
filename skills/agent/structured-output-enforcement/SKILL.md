---
name: structured-output-enforcement
description: Enforces deterministic agent output using JSON Schema, Pydantic models, and LLM-native format constraints to guarantee downstream consumers receive valid structured data.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  role: implementation
  scope: implementation
  output-format: code
  triggers: structured output, JSON Schema, Pydantic validation, deterministic output, format constraints, output parser, how do i guarantee valid agent output
  archetypes: [tactical]
  anti_triggers:
    - brainstorming
    - vague ideation
    - prompt writing, prompt design
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: prompt-chaining,prompt-engineering-patterns-v2,evaluation-monitoring
---

# Structured Output Enforcement Pattern

Enforces deterministic agent output using JSON Schema, Pydantic models, and LLM-native format constraints. This skill makes the model implement validation-with-retry loops, schema injection into system prompts, and output parser middleware to guarantee that downstream consumers always receive valid structured data.

## TL;DR Checklist

- [ ] Define strict Pydantic/JSON Schema for expected output
- [ ] Inject schema into LLM system prompt with explicit format instructions
- [ ] Parse and validate output against schema before proceeding
- [ ] Implement retry logic when validation fails (max 3 retries)
- [ ] Use soft constraints (prompt-level) and hard constraints (schema validation) in combination
- [ ] Log rejected outputs for prompt refinement
- [ ] Test with edge cases: empty fields, unexpected types, extra keys

---

## When to Use

Use this skill when:

- Building multi-step agent pipelines where each step requires validated input from the previous step
- Integrating LLM outputs into typed systems (databases, APIs, downstream code)
- Any downstream consumer has strict type requirements and cannot handle malformed data
- You need auditability of what format an agent's output conforms to

## When NOT to Use

Avoid this skill for:

- Free-form creative writing tasks where structure is optional
- Prototyping where speed matters more than correctness (use loose parsing first)
- Tasks where the LLM inherently produces unreliable structured output (improve the prompt first)

---

## Core Workflow

1. **Define Output Schema** — Create a Pydantic model or JSON Schema that precisely describes the expected output structure, including required fields, types, and constraints. **Checkpoint:** Validate schema covers all downstream consumption needs with no missing fields.
2. **Inject Schema into Prompt** — Embed the schema definition (as JSON) directly into the system prompt alongside explicit formatting instructions (e.g., "Output ONLY valid JSON matching this schema"). **Checkpoint:** Verify the schema is visible to the model and the instruction is unambiguous.
3. **Execute LLM Call with Output Parser** — Use an output parser (JsonOutputParser, PydanticOutputParser) that attempts to parse and validate the raw LLM response against the schema. **Checkpoint:** Confirm parser catches both structural errors (malformed JSON) and semantic errors (wrong types).
4. **Handle Validation Failure with Retry** — If validation fails, construct a targeted error message describing what's wrong, append it to the conversation, and retry with max 3 attempts. **Checkpoint:** Each retry must include specific feedback about what was wrong, not just "try again."
5. **Pass Validated Output to Downstream** — Once validated, pass the parsed object to the next step in the pipeline. **Checkpoint:** Ensure downstream code receives a typed object, not raw strings.
6. **Log Rejected Outputs for Refinement** — Track all validation failures with their retry count and error messages for later prompt quality analysis. **Checkpoint:** Logs must include the raw output, schema, and failure reason for debugging.

---

## Implementation Patterns

### Pattern 1: Pydantic Model with Output Parser (LangChain)

```python
from pydantic import BaseModel, Field
from typing import Optional
from langchain.output_parsers import PydanticOutputParser
from langchain.prompts import ChatPromptTemplate


class EntityExtraction(BaseModel):
    """Extracted entity from text."""

    name: str = Field(..., description="The entity's full name")
    type: str = Field(
        ..., description="Entity type: person, organization, location"
    )
    confidence: float = Field(
        ..., ge=0.0, le=1.0, description="Extraction confidence score"
    )
    attributes: list[str] = Field(
        default_factory=list, description="Extracted attributes"
    )


parser = PydanticOutputParser(pydantic_object=EntityExtraction)

prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are an entity extraction system. {format_instructions}\nText: {{text}}",
        ),
        ("user", "{text}"),
    ]
).partial(format_instructions=parser.get_format_instructions())
```

### Pattern 2: JSON Schema + Retry Logic with Targeted Feedback

```python
import json
from typing import Any


OUTPUT_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "summary": {"type": "string", "minLength": 1},
        "sentiment": {
            "type": "string",
            "enum": ["positive", "negative", "neutral"],
        },
        "key_points": {
            "type": "array",
            "items": {"type": "string"},
        },
    },
    "required": ["summary", "sentiment", "key_points"],
    "additionalProperties": False,
}

MAX_RETRIES: int = 3


def extract_with_validation(
    llm_client: Any,
    user_text: str,
    schema: dict = OUTPUT_SCHEMA,
    max_retries: int = MAX_RETRIES,
) -> dict | None:
    """Extract structured output with retry on validation failure.

    Args:
        llm_client: An LLM client with a generate() method accepting a string prompt.
        user_text: The raw text to analyze for structured extraction.
        schema: JSON Schema describing the expected output structure.
        max_retries: Maximum number of retry attempts on validation failure.

    Returns:
        A validated dictionary matching the schema, or None if all retries exhausted.
    """
    for attempt in range(max_retries):
        prompt = (
            f"Analyze this text. Output JSON matching schema: {json.dumps(schema, indent=2)}\n\n"
            f"Text: {user_text}"
        )
        response = llm_client.generate(prompt)
        raw_output = response.choices[0].message.content.strip()

        try:
            parsed = json.loads(raw_output)
            validate_against_schema(parsed, schema)
            return parsed
        except (json.JSONDecodeError, ValueError) as exc:
            if attempt < max_retries - 1:
                feedback = (
                    f"Validation failed: {exc}. Raw output was: "
                    f"{raw_output[:200]}... Fix the format and retry."
                )
                prompt_retry = (
                    f"{response.choices[0].message.content}\n\n"
                    f"Correction needed: {feedback}"
                )
                response = llm_client.generate(prompt_retry)
            else:
                return None
    return None


def validate_against_schema(data: dict, schema: dict) -> None:
    """Validate data against JSON Schema constraints.

    Args:
        data: The parsed dictionary to validate.
        schema: JSON Schema defining allowed structure and types.

    Raises:
        ValueError: If required fields are missing or additional properties exist.
        TypeError: If a field's type does not match the schema definition.
    """
    if (
        "additionalProperties" in schema
        and schema["additionalProperties"] is False
    ):
        allowed = set(schema.get("properties", {}).keys())
        extra = set(data.keys()) - allowed
        if extra:
            raise ValueError(f"Unexpected keys: {extra}")

    for field, props in schema.get("properties", {}).items():
        if field not in data:
            if "required" in schema and field in schema["required"]:
                raise ValueError(f"Missing required field: {field}")
        elif (
            props.get("type") == "string"
            and not isinstance(data[field], str)
        ):
            raise TypeError(
                f"Field '{field}' must be string, got "
                f"{type(data[field]).__name__}"
            )
```

### Pattern 3: XML Tag Encapsulation for Structured Output

```python
import re


def extract_xml_structured_output(
    raw_response: str,
    tag_name: str = "result",
) -> str | None:
    """Extract content from XML-tagged LLM output with error handling.

    Args:
        raw_response: The raw text response from the LLM.
        tag_name: The XML tag name to extract content from.

    Returns:
        The trimmed content inside the tag, or None if not found.

    Raises:
        ValueError: If the tag is found but its content is empty.
    """
    pattern = rf"<{tag_name}>(.*?)</{tag_name}>"
    match = re.search(pattern, raw_response, re.DOTALL)

    if not match:
        return None

    content = match.group(1).strip()
    if not content:
        raise ValueError(f"Empty {tag_name} block")

    return content


# BAD — No structure enforcement
# response = llm.generate("Summarize this text: ...")  # Free-form, unpredictable format

# GOOD — XML-tagged output with parser
# raw = llm.generate("Respond in <result>...</result> tags.")
# parsed = extract_xml_structured_output(raw)
# assert parsed is not None, "LLM failed to produce structured tags"
```

### Pattern 4: Soft + Hard Constraint Combination

```python
from dataclasses import dataclass, field


@dataclass
class ValidationResult:
    """Result of a validation run against structured output constraints.

    Attributes:
        valid: Whether the output passed all hard constraints.
        errors: List of error messages from hard constraint failures.
        warnings: List of warning messages from soft constraint checks.
        parsed_data: The successfully parsed and validated data, if any.
    """

    valid: bool
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    parsed_data: dict | None = None


def enforce_output_constraints(
    llm_response: str,
    schema: dict,
    soft_instructions: str,
) -> ValidationResult:
    """Combine prompt-level (soft) and schema-level (hard) constraints.

    Performs two tiers of validation: soft checks inspect the output's
    formatting hints at a high level, while hard checks enforce strict
    JSON Schema compliance.

    Args:
        llm_response: The raw string response from the LLM.
        schema: JSON Schema defining the expected structure and types.
        soft_instructions: Descriptive prompt instructions for format guidance.

    Returns:
        A ValidationResult with validity status, errors, warnings, and data.
    """
    warnings: list[str] = []
    errors: list[str] = []

    # Soft check: Does output follow instruction format?
    if not llm_response.strip().startswith("{"):
        warnings.append(
            "Output does not start with '{' — may be malformed JSON"
        )

    # Hard check: Schema validation
    try:
        parsed = json.loads(llm_response)
        validate_against_schema(parsed, schema)
        return ValidationResult(
            valid=True, errors=[], warnings=warnings, parsed_data=parsed
        )
    except (json.JSONDecodeError, ValueError) as exc:
        errors.append(str(exc))
        return ValidationResult(valid=False, errors=errors, warnings=warnings)
```

## Constraints

### MUST DO
1. Always define a strict output schema before any LLM call — never assume the model will produce correct structure
2. Combine soft constraints (prompt instructions) with hard constraints (schema validation) for maximum reliability
3. Include explicit format examples in the prompt when dealing with complex nested structures
4. Implement retry logic with specific, actionable feedback on each failure
5. Validate at every step of a pipeline — never trust output from one step without validation
6. Use Pydantic models over raw dicts for downstream code to benefit from type safety and IDE support
7. Reference `code-philosophy` (5 Laws of Elegant Defense): parse don't validate at schema boundary, fail fast on invalid structure
8. Log all validation failures with raw output for prompt quality analysis and iterative improvement

### MUST NOT DO
1. Rely solely on prompt-level instructions without schema validation — LLMs are not deterministic
2. Use `pass` or empty error handlers when validation fails — always surface the error to the caller
3. Retry more than 3 times without escalating — if the model can't produce valid output after 3 attempts, escalate for manual review
4. Include extra fields not defined in the schema and expect the consumer to handle them gracefully
5. Skip validation of nested structures — validate every level of nesting independently
6. Use regex to parse JSON — always use a proper JSON parser; regex is fragile with whitespace and escaping

---

## Output Template

When this skill is active, deliver:

1. **Pydantic model or JSON Schema** — Complete type definition for the expected output
2. **Prompt template** — System prompt with schema injection and format instructions
3. **Validation function** — Code that parses and validates output against the schema
4. **Retry logic** — Error handling with specific feedback per failure type
5. **Integration point** — How to connect validated output to downstream consumers

---

## Related Skills

| Skill | Purpose |
|---|---|
| `prompt-chaining` | Validates structured output between chain steps |
| `prompt-engineering-patterns-v2` | Writing the prompt that produces valid output |
| `evaluation-monitoring` | Tracking validation failure rates over time |

> 📖 skill(local cache): prompt-chaining, prompt-engineering-patterns-v2
