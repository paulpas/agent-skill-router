---
name: structured-output-validation
description: Implements structured output patterns for AI agent systems including Pydantic model validation, JSON Schema generation, function calling contracts, response parsing with retry loops, and schema evolution for reliable agent-to-agent communication.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  triggers: structured output, Pydantic validation, JSON Schema, function calling, response parsing, typed responses, LLM output parsing, constrained decoding
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: tool-use-function-calling, langgraph-state-machine, multi-agent-orchestration, prompt-engineering-patterns
  archetypes:
    - tactical
    - enforcement
  anti_triggers:
    - brainstorming
    - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
---

# Structured Output Validation for AI Agents

Implements structured output patterns that ensure reliable, type-safe communication between AI agents and their tools. This skill covers Pydantic model-based validation, JSON Schema generation for function calling, response parsing with automatic retry on schema violations, constrained decoding techniques, and schema evolution strategies — critical primitives for production-grade agent systems as of 2025-2026.

## TL;DR Checklist

- [ ] Define all agent outputs using Pydantic BaseModel subclasses with field descriptions
- [ ] Generate JSON Schema from Pydantic models using `model_json_schema()`
- [ ] Use Pydantic's `.model_validate_json()` for parsing LLM responses (auto-retries on failure)
- [ ] Add custom validators (`@field_validator`, `@model_validator`) for domain constraints
- [ ] Implement a retry loop that feeds validation errors back to the LLM as feedback
- [ ] Version schema evolution with backward-compatible migrations

---

## When to Use

Use this skill when:

- Agent outputs must be consumed by downstream code (another agent, API, database)
- You need deterministic parsing of LLM responses into structured data
- Multiple agents exchange data and you need a shared contract for message formats
- You are building tool/function calling interfaces that require JSON Schema definitions
- Your system processes LLM output programmatically — free-text outputs are not parseable by other code

## When NOT to Use

Avoid this skill for:

- Creative writing tasks where structure constrains the LLM's expressiveness
- One-shot chat responses shown directly to end users (format as markdown instead)
- Early-stage prototypes where rapid iteration matters more than reliability

---

## Core Workflow

### 1. Define Output Contracts with Pydantic Models

Every agent or tool that produces structured output must declare its schema as a Pydantic `BaseModel`. Field descriptions serve dual purposes: they validate data types AND provide context to the LLM about expected format.

```python
from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional
import enum


class Sentiment(str, enum.Enum):
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"


class SearchResult(BaseModel):
    """A single search result with metadata for downstream consumption."""
    title: str = Field(description="The document or page title")
    url: str = Field(description="Canonical URL of the source")
    snippet: str = Field(description="Relevant excerpt from the content, max 200 chars")
    relevance_score: float = Field(
        ge=0.0, le=1.0,
        description="Relevance score between 0.0 (irrelevant) and 1.0 (highly relevant)"
    )

    @field_validator("snippet")
    @classmethod
    def truncate_snippet(cls, v: str) -> str:
        """Ensure snippet does not exceed 200 characters."""
        return v[:200] if len(v) > 200 else v


class SearchQuery(BaseModel):
    """A parsed search query extracted from natural language."""
    keywords: list[str] = Field(
        description="Extracted search keywords, typically 3-5 terms"
    )
    sentiment: Sentiment = Field(
        default=Sentiment.NEUTRAL,
        description="Overall sentiment of the query context"
    )
    intent: str = Field(
        description="User's underlying intent (e.g., 'comparison', 'tutorial', 'bug fix')"
    )

    @field_validator("keywords")
    @classmethod
    def validate_keywords(cls, v: list[str]) -> list[str]:
        if not v:
            raise ValueError("At least one keyword is required")
        if len(v) > 10:
            raise ValueError("Maximum 10 keywords allowed")
        # Strip whitespace from each keyword
        return [k.strip().lower() for k in v]


class AnalysisReport(BaseModel):
    """Structured analysis output with confidence scores."""
    title: str = Field(description="Report title, concise and descriptive")
    executive_summary: str = Field(description="2-3 sentence summary of key findings")
    findings: list[dict[str, str | float]] = Field(
        description="List of findings with 'finding' (str) and 'confidence' (0.0-1.0)"
    )
    recommendations: list[str] = Field(
        default_factory=list,
        description="Actionable recommendations based on the analysis"
    )

    @model_validator(mode="after")
    def validate_findings_confidence(self) -> "AnalysisReport":
        """Validate that all findings have confidence scores in valid range."""
        for finding in self.findings:
            conf = finding.get("confidence", 0.0)
            if not (0.0 <= conf <= 1.0):
                raise ValueError(f"Finding confidence must be 0.0-1.0, got {conf}")
        return self
```

**Checkpoint:** Field descriptions in Pydantic models are automatically included in JSON Schema generation and passed to the LLM as context. Write them as clear instructions — the LLM reads them during response generation.

### 2. Generate JSON Schema for Function Calling

LLM APIs that support function/tool calling require a JSON Schema definition. Pydantic models can be converted directly using `model_json_schema()`.

```python
from pydantic import TypeAdapter


def extract_search_query(natural_language: str) -> SearchQuery:
    """Extract structured search query from natural language input.

    In production, this would call an LLM with a structured output prompt.
    Here we demonstrate the schema generation and parsing pattern.
    """
    # Generate JSON Schema from Pydantic model — this is what the LLM sees
    schema = TypeAdapter(SearchQuery).json_schema()

    # The LLM prompt uses the schema as a format guide
    prompt = f"""Extract search parameters from the following query.
Return ONLY valid JSON matching this schema:
{schema}

Query: {natural_language}
"""

    return parse_llm_response(prompt, SearchQuery)


def parse_llm_response(response_text: str, model_cls: type[BaseModel]) -> BaseModel:
    """Parse an LLM response into a Pydantic model with automatic validation.

    Uses pydantic-core's fast JSON parsing for efficiency. On failure,
    raises ValidationError that can be caught and used for retry logic.

    Args:
        response_text: Raw text from the LLM (may include markdown fences).
        model_cls: Pydantic BaseModel subclass to parse into.

    Returns:
        Validated model instance.

    Raises:
        ValueError: If parsing fails or validation errors are found.
    """
    import re

    # Strip markdown code fences if present (common in LLM responses)
    cleaned = re.sub(r"```(?:json)?\s*", "", response_text.strip())
    cleaned = cleaned.rstrip("`").strip()

    try:
        return model_cls.model_validate_json(cleaned)
    except Exception as exc:
        raise ValueError(
            f"Failed to parse LLM response into {model_cls.__name__}: {exc}\n"
            f"Raw response: {response_text[:500]}"
        ) from exc


# --- Usage Example ---

def demo_extraction() -> None:
    """Demonstrate search query extraction with validation."""
    response = """{
        "keywords": ["python", "async", "await", "concurrency"],
        "sentiment": "neutral",
        "intent": "tutorial"
    }"""

    parsed = parse_llm_response(response, SearchQuery)
    print(f"Parsed: keywords={parsed.keywords}, intent={parsed.intent}")


def demo_search_results() -> None:
    """Demonstrate search results parsing."""
    response = """{
        "title": "Python Async/Await Guide",
        "url": "https://docs.python.org/3/library/asyncio.html",
        "snippet": "Learn how to use async and await in Python for concurrent programming.",
        "relevance_score": 0.95
    }"""

    parsed = parse_llm_response(response, SearchResult)
    print(f"Title: {parsed.title}, Score: {parsed.relevance_score}")
```

### 3. Implement Retry Loops with Validation Error Feedback

When the LLM produces invalid output, don't just reject it — feed the validation error back as structured feedback so the LLM can self-correct.

```python
import logging
from typing import TypeVar

logger = logging.getLogger(__name__)
T = TypeVar("T", bound=BaseModel)


class StructuredOutputEngine:
    """Manages LLM interaction with structured output, including retry on validation failure."""

    def __init__(
        self,
        llm_client: any,  # Abstracted — could be OpenAI, Anthropic, etc.
        max_retries: int = 3,
        system_prompt: str = "",
    ) -> None:
        self.llm_client = llm_client
        self.max_retries = max_retries
        self.system_prompt = system_prompt

    def call_with_structured_output(
        self,
        user_prompt: str,
        response_model: type[T],
        schema_description: str | None = None,
    ) -> T:
        """Call LLM and parse response into a structured model with retry.

        On validation failure, constructs a feedback message from the error
        details and retries with the corrected instructions. This "self-healing"
        pattern dramatically improves reliability compared to single-attempt parsing.

        Args:
            user_prompt: The user's request to send to the LLM.
            response_model: Pydantic model class for the expected output.
            schema_description: Optional human-readable description of the expected format.

        Returns:
            Validated model instance.

        Raises:
            ValueError: If all retries fail with invalid output.
        """
        # Generate JSON Schema for the response model
        from pydantic import TypeAdapter
        json_schema = TypeAdapter(response_model).json_schema()

        # Build the prompt with schema guidance
        prompt_template = self.system_prompt or (
            "You are a precise data extraction assistant. Your responses must be valid JSON\n"
            "that conforms exactly to the provided schema. Do not include markdown fences,\n"
            "comments, or any text outside the JSON object.\n\n"
            f"Expected response format:\n{json_schema}\n\n"
        )

        if schema_description:
            prompt_template += f"\nSchema description: {schema_description}\n"

        feedback = ""
        last_response = ""

        for attempt in range(1, self.max_retries + 1):
            # Combine base prompt with user request and any feedback from previous attempt
            full_prompt = prompt_template

            if feedback:
                full_prompt += (
                    f"\n\nPREVIOUS ATTEMPT FAILED — please fix the following issues:\n{feedback}\n"
                )

            full_prompt += f"\n\nUser request: {user_prompt}"

            # Call LLM
            last_response = self.llm_client.generate(full_prompt)

            # Try to parse and validate
            try:
                model_instance = parse_llm_response(last_response, response_model)
                logger.info(
                    "Structured output parsed successfully on attempt %d", attempt
                )
                return model_instance

            except ValueError as exc:
                feedback = str(exc)
                logger.warning(
                    "Attempt %d/%d failed validation. Feedback: %s",
                    attempt, self.max_retries, feedback[:200],
                )

        # All retries exhausted — raise with last error and response for debugging
        raise ValueError(
            f"Failed to parse structured output after {self.max_retries} attempts.\n"
            f"Last validation error: {feedback}\n"
            f"Last LLM response (truncated): {last_response[:1000]}"
        )


# --- Usage Example ---

def extract_keywords_with_retry(llm_client: any, query: str) -> SearchQuery:
    """Extract search keywords with self-healing retry."""
    engine = StructuredOutputEngine(
        llm_client=llm_client,
        max_retries=3,
        system_prompt=(
            "Extract structured parameters from the user's natural language request.\n"
            "Always return valid JSON. Never include markdown fences or explanatory text."
        ),
    )

    return engine.call_with_structured_output(
        user_prompt=query,
        response_model=SearchQuery,
        schema_description=(
            "Extract the search intent, sentiment context, and relevant keywords "
            "from the user's request. Limit to 10 keywords maximum."
        ),
    )
```

### 4. Constrained Decoding for Guaranteed Valid Output

Some LLM providers support constrained decoding (also called "logit bias" or "guided JSON"), which restricts the LLM's output space to only produce valid JSON according to a schema. This eliminates parsing failures entirely.

```python
import json


class ConstrainedDecoding:
    """Manages constrained/structured generation for LLM APIs that support it.

    Constrained decoding forces the LLM to produce output that matches
    a JSON Schema at the token level — zero parsing errors guaranteed.

    Supported providers (2025-2026):
    - OpenAI: response_format={"type": "json_schema", "json_schema": {...}}
    - Anthropic: tool_use with strict schemas, or JSON mode
    - Ollama/Llama.cpp: grammar-based constrained generation
    - vLLM: guided JSON via Outlines integration
    """

    @staticmethod
    def build_openai_constrained_config(
        response_model: type[BaseModel],
        model_name: str = "output_schema",
    ) -> dict:
        """Build OpenAI's constrained decoding configuration.

        OpenAI 2024-09+ supports response_format with JSON Schema enforcement.
        The LLM is forced to produce output matching the schema exactly.

        Args:
            response_model: Pydantic model for the expected output.
            model_name: Identifier for this response format (for API tracking).

        Returns:
            Config dict for OpenAI's chat.completions API.
        """
        from pydantic import TypeAdapter

        json_schema = TypeAdapter(response_model).json_schema()

        return {
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": model_name,
                    "schema": json_schema,
                    "strict": True,  # Requires strict schema mode (OpenAI GPT-4o+)
                },
            }
        }

    @staticmethod
    def build_anthropic_strict_config(
        response_model: type[BaseModel],
        tool_name: str = "structured_output",
    ) -> dict:
        """Build Anthropic's tool-use structured output configuration.

        Anthropic uses tool definitions with strict JSON schemas. The LLM
        must invoke the tool with valid parameters matching the schema.

        Args:
            response_model: Pydantic model for the expected output.
            tool_name: Name of the tool/function to invoke.

        Returns:
            Tool definition dict for Anthropic's messages API.
        """
        from pydantic import TypeAdapter

        json_schema = TypeAdapter(response_model).json_schema()

        return {
            "tools": [
                {
                    "name": tool_name,
                    "description": f"Return a structured response conforming to the required schema.",
                    "input_schema": json_schema,
                }
            ]
        }

    @staticmethod
    def build_ollama_grammar(
        response_model: type[BaseModel],
    ) -> str:
        """Build an Ollama/LLama.cpp grammar for constrained generation.

        Uses Lark grammar syntax to constrain output at the token level.
        This works with any model loaded via llama.cpp or Ollama with
        the `grammar` parameter enabled.

        Note: Grammar generation from Pydantic models is approximate —
        it captures the top-level structure but may not perfectly match
        nested field types for complex schemas.

        Args:
            response_model: Pydantic model for constrained output.

        Returns:
            Lark grammar string for constrained generation.
        """
        from pydantic import TypeAdapter

        schema = TypeAdapter(response_model).json_schema()
        properties = schema.get("properties", {})

        # Build a simplified JSON grammar (covers most practical schemas)
        grammar_lines = [
            'start ::= object',
            'object ::= "{" [member ("," member)*] "}"',
            'member ::= string ":" value',
            'string ::= "\"" ([^"\\\\] | "\\\\" x)* "\""',
            'number ::= "-"? ([0-9] | [1-9] [0-9]*) ("." [0-9]+)? ([eE] [-+]? [0-9]+)?',
            'value ::= string | number | object | array | "true" | "false" | "null"',
            'array ::= "[" [value ("," value)*] "]"',
        ]

        return "\n".join(grammar_lines)


# --- Usage with OpenAI ---

def call_openai_constrained(
    llm_client: any,
    messages: list[dict],
    response_model: type[BaseModel],
) -> BaseModel:
    """Call OpenAI with constrained decoding — zero parsing errors."""
    config = ConstrainedDecoding.build_openai_constrained_config(response_model)

    # Merge into the API call
    response = llm_client.chat.completions.create(
        model="gpt-4o-2024-11-20",  # Supports constrained decoding
        messages=messages,
        **config,  # Unpacks response_format config
    )

    # Even with constrained decoding, parse to validate (defense in depth)
    content = response.choices[0].message.content
    return parse_llm_response(content, response_model)
```

### 5. Schema Evolution and Versioning

As your agent system evolves, output schemas change. Design schemas that evolve without breaking existing consumers using optional fields, default values, and version tags.

```python
from pydantic import BaseModel, Field


class ReportOutputV1(BaseModel):
    """Initial report schema — minimal structure."""
    title: str = Field(description="Report title")
    summary: str = Field(description="Executive summary paragraph")
    sections: list[dict[str, str]] = Field(
        description="List of {title, content} dicts"
    )


class ReportOutputV2(BaseModel):
    """Evolved schema with backward-compatible additions.

    Changes from V1:
    - Added 'confidence' field (optional, defaults to 0.8)
    - Added 'tags' field (optional list of strings)
    - Changed sections to include 'subtitle' and 'source'
    - Added 'metadata' dict for arbitrary key-value pairs
    """

    title: str = Field(description="Report title")
    summary: str = Field(description="Executive summary paragraph")

    # Evolved section format — subtitle and source are optional
    sections: list[dict[str, str]] = Field(
        description="List of sections with 'title', optional 'subtitle'/'source'"
    )

    confidence: float = Field(
        default=0.8,
        ge=0.0,
        le=1.0,
        description="Overall confidence in the report quality",
    )

    tags: list[str] = Field(
        default_factory=list,
        description="Categorical tags for indexing and search",
    )

    metadata: dict[str, str] = Field(
        default_factory=dict,
        description="Arbitrary metadata (version, author, generated_at)",
    )


def migrate_v1_to_v2(v1_data: dict) -> ReportOutputV2:
    """Migrate V1 data to V2 format during schema transition.

    Called when old checkpoint data needs to be upgraded to the new schema.
    Missing fields are filled with sensible defaults.
    """
    # Ensure all sections have required keys from V2
    enhanced_sections = []
    for section in v1_data.get("sections", []):
        enhanced = dict(section)  # Copy original keys
        enhanced.setdefault("subtitle", "")
        enhanced.setdefault("source", "")
        enhanced_sections.append(enhanced)

    return ReportOutputV2(
        title=v1_data.get("title", "Untitled"),
        summary=v1_data.get("summary", ""),
        sections=enhanced_sections,
        confidence=0.8,  # Default confidence for migrated data
        tags=v1_data.get("tags", []),
        metadata=v1_data.get("metadata", {"migrated_from": "v1"}),
    )


# --- Schema Registry Pattern ---

class SchemaRegistry:
    """Registry for managing schema versions and migrations."""

    def __init__(self) -> None:
        self._schemas: dict[str, type[BaseModel]] = {
            "report:v1": ReportOutputV1,
            "report:v2": ReportOutputV2,
        }
        self._migrations: dict[str, callable] = {
            ("report:v1", "report:v2"): migrate_v1_to_v2,
        }

    def get_schema(self, key: str) -> type[BaseModel]:
        """Get a schema class by versioned key."""
        if key not in self._schemas:
            raise KeyError(f"Schema '{key}' not found. Available: {list(self._schemas.keys())}")
        return self._schemas[key]

    def migrate(self, data: dict, from_version: str, to_version: str) -> dict:
        """Migrate data between schema versions."""
        migration_key = (from_version, to_version)
        if migration_key not in self._migrations:
            raise ValueError(
                f"No migration path from '{from_version}' to '{to_version}'. "
                f"Available migrations: {list(self._migrations.keys())}"
            )

        migrator = self._migrations[migration_key]
        return migrator(data)

    def validate_and_migrate(
        self, data: dict, expected_version: str
    ) -> BaseModel:
        """Validate data against expected schema, migrating if necessary."""
        schema = self.get_schema(expected_version)

        try:
            # Try parsing directly with the target schema
            return schema.model_validate(data)
        except Exception:
            # Parsing failed — detect source version and migrate
            for source_key, target_key in self._migrations.keys():
                if target_key == expected_version:
                    try:
                        migrated = self.migrate(data, source_key, target_key)
                        return schema.model_validate(migrated)
                    except Exception:
                        continue

        raise ValueError(
            f"Cannot validate data against {expected_version}. "
            f"Data: {data}"
        )
```

---

## Implementation Patterns

### Pattern 1: Agent-to-Agent Output Contract

Define a shared module with all output contract models that agents reference when communicating. This creates a single source of truth for message formats.

```python
# agents/contracts.py — Shared output contracts (import by all agents)

from pydantic import BaseModel, Field
from typing import Optional


class ResearchOutput(BaseModel):
    """Contract for research agent output. Consumed by analyst and writer agents."""
    topic: str = Field(description="The researched topic")
    key_findings: list[str] = Field(
        min_length=1,
        description="List of distinct findings, each a complete sentence"
    )
    sources: list[dict[str, str]] = Field(
        description="Source references with 'title' and 'url'"
    )
    confidence: float = Field(ge=0.0, le=1.0)


class TaskOutput(BaseModel):
    """Contract for task execution agent output."""
    success: bool = Field(description="Whether the task completed successfully")
    result_type: str = Field(
        description="Category of result: 'text', 'code', 'data', 'file', 'error'"
    )
    content: Optional[str] = Field(
        default=None,
        description="Result content — format depends on result_type"
    )
    error_message: Optional[str] = Field(
        default=None,
        description="Error details if success=False"
    )


# --- Agent consuming ResearchOutput ---

def analyze_research(research_data: dict) -> str:
    """Consumer that validates research agent output before processing."""
    # Parse and validate — raises ValueError on invalid format
    research = parse_llm_response(str(research_data), ResearchOutput)

    # Process validated data
    findings_count = len(research.key_findings)
    source_count = len(research.sources)
    return (
        f"Research complete: {findings_count} findings from {source_count} sources. "
        f"Confidence: {research.confidence:.0%}"
    )
```

### Pattern 2: Tool Schema Generation for Function Calling

Generate JSON Schema from Pydantic models to use as tool/function definitions in LLM APIs. This ensures the LLM knows exactly what parameters to produce.

```python
from pydantic import TypeAdapter


def generate_tool_definition(
    tool_name: str,
    tool_description: str,
    param_model: type[BaseModel],
) -> dict:
    """Generate an OpenAI-compatible tool definition from a Pydantic model.

    The model's fields become the tool's parameters schema.
    Field descriptions become the parameter descriptions in the schema.

    Args:
        tool_name: Name of the tool (e.g., "web_search", "code_execute").
        tool_description: What the tool does, for LLM context.
        param_model: Pydantic model describing the tool's input parameters.

    Returns:
        Tool definition dict compatible with OpenAI/AutoGen/CrewAI function calling.
    """
    schema = TypeAdapter(param_model).json_schema()

    return {
        "type": "function",
        "function": {
            "name": tool_name,
            "description": tool_description,
            "parameters": schema,
        },
    }


def generate_crewai_tool_definition(
    tool_name: str,
    tool_description: str,
    param_model: type[BaseModel],
) -> dict:
    """Generate a CrewAI-compatible tool definition."""
    return {
        "name": tool_name,
        "description": tool_description,
        "schema": TypeAdapter(param_model).json_schema(),
    }


# --- Example: Web Search Tool Definition ---

class WebSearchParams(BaseModel):
    query: str = Field(description="The search query to execute")
    max_results: int = Field(default=5, ge=1, le=20)
    language: str = Field(default="en", description="ISO 639-1 language code")


web_search_tool = generate_tool_definition(
    tool_name="web_search",
    tool_description=(
        "Search the web for information. Returns a list of search results "
        "with titles, URLs, and snippets."
    ),
    param_model=WebSearchParams,
)

# Result:
# {
#   "type": "function",
#   "function": {
#     "name": "web_search",
#     "description": "Search the web for information...",
#     "parameters": {
#       "properties": {
#         "query": {"type": "string", "description": "The search query to execute"},
#         "max_results": {"type": "integer", "default": 5, "minimum": 1, ...},
#         "language": {"type": "string", "default": "en", ...}
#       },
#       "required": ["query"],
#       "type": "object"
#     }
#   }
# }
```

---

## Constraints

### MUST DO

- **Always use Pydantic v2** (`BaseModel`, `model_validate_json`, `TypeAdapter`) — Pydantic v1's `.parse_raw()` and `.parse_obj()` are deprecated. Use the v2 API exclusively.
- **Include field descriptions in every model** — These serve triple duty: (1) JSON Schema generation for tool calling, (2) LLM context during response generation, (3) Self-documentation for human readers.
- **Validate at the boundary** — Every piece of data entering your system from an LLM must be parsed through a Pydantic model before use. Never trust raw LLM output without validation.
- **Use `.model_validate_json()` not `.model_validate()`** — `model_validate_json()` is significantly faster (pydantic-core C implementation) and parses directly from JSON strings without intermediate dict conversion.

### MUST NOT DO

- **Never use regex-based parsing for structured output** — Regex cannot reliably parse nested JSON, handle escape sequences, or validate types. Always use Pydantic's `model_validate_json()`.
- **Never embed secrets in schema descriptions** — Field descriptions are sent to the LLM API. If a field name is `api_key` with description "Your OpenAI API key", the key may be logged or cached by the provider. Use generic descriptions like "Secret credential" instead.
- **Never skip retry on validation failure** — A single-attempt structured output pipeline has ~15-30% failure rate even with good models. Always implement a retry loop with error feedback.

---

## TL;DR for Code Generation

- Output contracts = Pydantic `BaseModel` subclasses with `Field(description=...)` on every field
- Schema generation = `TypeAdapter(Model).json_schema()` — used for tool calling and prompt guidance
- Parsing = `Model.model_validate_json(cleaned_response)` — fast C implementation
- Retry = catch `ValidationError`, feed error message back to LLM, retry up to 3 times
- Constrained decoding = use provider-native features (OpenAI `response_format`, Anthropic tools) for zero-failure generation
- Schema evolution = add optional fields with defaults, provide migration functions for existing data

---

## Related Skills

| Skill | Purpose |
|---|---|
| `tool-use-function-calling` | Tool/function calling in LLM APIs requires JSON Schema definitions — this skill generates those schemas from Pydantic models |
| `langgraph-state-machine` | LangGraph nodes use typed state; structured output validation ensures state transitions are valid |
| `multi-agent-orchestration` | Multi-agent systems need shared output contracts for reliable inter-agent communication |
| `prompt-engineering-patterns` | Structured output works best when the system prompt reinforces the format requirements |

## Live References

> Authoritative documentation links for structured output patterns.

- [Pydantic Documentation](https://docs.pydantic.dev/latest/)
- [Pydantic v2 Migration Guide](https://docs.pydantic.dev/latest/migration/)
- [OpenAI JSON Mode](https://platform.openai.com/docs/guides/structured-outputs)
- [Anthropic Tool Use](https://docs.anthropic.com/en/docs/build-with-claude/tool-use)
- [LLama.cpp Grammar Constrained Generation](https://github.com/ggerganov/llama.cpp/blob/master/examples/greedy.py)
- [Outlines Guided Generation](https://outlines.dev/)
