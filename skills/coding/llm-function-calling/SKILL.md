---
name: llm-function-calling
description: Implements reliable LLM function calling patterns including JSON Schema tool definitions, structured output parsing with Pydantic v2, retry strategies, and error handling for cross-provider tool use.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: function calling, tool use, structured output, json schema, llm api, pydantic validation, tool definition, how do i make an llm call code
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: anthropic-api, agent-security-guardrails, api-design, agent-debugging
  archetypes:
    - tactical
    - diagnostic
    - generation
  anti_triggers:
    - brainstorming
    - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
---

# LLM Function Calling & Tool Use Patterns

Implements reliable function calling patterns that make LLMs call your code safely and correctly. Handles tool definition design, JSON Schema validation, structured output parsing with Pydantic v2, retry/fallback chains, and malformed response recovery across OpenAI, Anthropic, and OpenRouter-compatible APIs.

## TL;DR Checklist

- [ ] Define tools using JSON Schema Draft 2020-12 with explicit `type` and `properties`
- [ ] Use Pydantic v2 models to validate function arguments before execution
- [ ] Wrap tool calls in try/except with retry on schema validation errors
- [ ] Reject malformed tool calls with a structured error response (not raw traceback)
- [ ] Implement a fallback handler when all retries are exhausted
- [ ] Keep tool definitions focused: one tool per concern, max 8 required fields

---

## When to Use

Use this skill when:

- Designing or implementing function/tool definitions for an LLM API call
- Building structured output parsers that validate LLM-generated arguments
- Debugging repeated schema validation failures from model responses
- Implementing retry logic specifically for function calling edge cases
- Adding safety guardrails around what tools the LLM can invoke and with what arguments

---

## When NOT to Use

Avoid this skill for:

- General API design without LLM involvement — use standard REST/gRPC patterns instead
- Prompt engineering that doesn't involve tool/function definitions
- Building the LLM provider integration itself (authentication, streaming) — use `anthropic-api` or similar
- High-level agent architecture decisions — use `agent-architecture-patterns` instead

---

## Core Workflow

1. **Define Tool Schema** — Create a JSON Schema that describes the tool's purpose, parameters, and constraints. Use Pydantic models as source of truth.
   **Checkpoint:** Validate schema with `jsonschema.validate()` against Draft 2020-12 before passing to any provider.

2. **Wrap Tool in Execution Layer** — Create a function that validates arguments, executes the tool logic, and returns structured results or errors. Use Pydantic's `TypeAdapter` for parsing.
   **Checkpoint:** Every tool wrapper must catch validation errors separately from execution errors.

3. **Handle Provider-Specific Call Format** — Map your tool definitions to the format expected by each provider (OpenAI function calling, Anthropic tool use, OpenRouter pass-through).
   **Checkpoint:** Never hardcode provider-specific types; use a normalization layer.

4. **Parse and Validate LLM Response** — When the LLM returns tool calls, validate each one against its schema before execution. Extract arguments from `tool_calls` array.
   **Checkpoint:** If validation fails, return an error message to the LLM (do not execute).

5. **Implement Retry + Fallback Chain** — On validation failure, construct a corrected prompt and retry up to 2 times. After exhaustion, use default/safe fallback values.
   **Checkpoint:** Each retry must include the previous error in the conversation history so the LLM can self-correct.

---

## Implementation Patterns

### Pattern 1: Pydantic-Powered Tool Definition & Validation

Use Pydantic v2 models as the single source of truth for tool schemas. This gives you both a clean API for developers and auto-generated JSON Schema that providers understand.

```python
"""Tool definition system using Pydantic v2 models for schema generation."""

from __future__ import annotations

import json
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


class WeatherParams(BaseModel):
    """Parameters for fetching current weather data.

    Attributes:
        city: City name in any language (e.g., "Tokyo", "São Paulo")
        units: Temperature unit system. Defaults to "celsius".
    """

    city: str = Field(
        description="City name, e.g. 'London' or 'New York'",
        min_length=1,
        max_length=200,
    )
    units: Literal["celsius", "fahrenheit", "kelvin"] = Field(
        default="celsius",
        description="Temperature unit for the response",
    )

    @field_validator("city")
    @classmethod
    def strip_city(cls, v: str) -> str:
        """Normalize city input by stripping whitespace."""
        stripped = v.strip()
        if not stripped:
            raise ValueError("city must be a non-empty string")
        return stripped


def get_tool_definition(model: type[BaseModel]) -> dict[str, Any]:
    """Convert a Pydantic model into a provider-compatible tool definition.

    Generates JSON Schema Draft 2020-12 from the model's `model_json_schema()`
    and wraps it in the standard function-calling format used by OpenAI,
    Anthropic, and other providers.

    Args:
        model: A Pydantic BaseModel subclass with Field() annotations.

    Returns:
        Dict with 'type' set to 'function' and 'function' containing name,
        description, and parameters schema.
    """
    schema = model.model_json_schema()
    tool_name = _infer_function_name(model.__name__)

    return {
        "type": "function",
        "function": {
            "name": tool_name,
            "description": model.model_docstring().strip()
            or f"Execute the {tool_name} operation.",
            "parameters": schema,
        },
    }


def parse_tool_arguments(
    raw_args: str | dict[str, Any],
    model: type[BaseModel],
) -> BaseModel:
    """Parse and validate raw LLM arguments against a Pydantic model.

    Handles both string (JSON-encoded) and dict formats that models may return.

    Args:
        raw_args: Raw argument payload from the LLM response.
        model: The Pydantic model to validate against.

    Returns:
        Validated Pydantic model instance.

    Raises:
        ValueError: If arguments fail schema validation.
    """
    if isinstance(raw_args, str):
        parsed = json.loads(raw_args)
    else:
        parsed = raw_args

    try:
        return model.model_validate(parsed)
    except Exception as e:
        raise ValueError(
            f"Invalid arguments for {model.__name__}: {e}"
        ) from e


def _infer_function_name(model_name: str) -> str:
    """Convert a Pydantic model name to a lowercase snake_case function name."""
    import re

    # Handle PascalCase and CamelCase conversion
    s1 = re.sub(r"(.)([A-Z][a-z]+)", r"\1_\2", model_name)
    return re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", s1).lower()
```

### Pattern 2: Cross-Provider Tool Call Normalizer

Different providers use different formats for tool definitions and tool calls. This normalizer maps all incoming provider responses to a unified internal representation, making your execution layer provider-agnostic.

```python
"""Normalizes LLM tool calls from multiple providers into a unified format."""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class ToolCall:
    """Unified internal representation of an LLM tool call.

    Attributes:
        id: Unique identifier for this tool call (used in response).
        name: The function/tool name the LLM wants to invoke.
        arguments: Parsed argument dictionary, already validated by caller.
        raw_arguments: Original raw argument string from the provider.
        provider: Source provider name (e.g., 'openai', 'anthropic').
    """

    id: str
    name: str
    arguments: dict[str, Any]
    raw_arguments: str
    provider: str = "unknown"


@dataclass
class ToolCallResult:
    """Result from executing a tool call.

    Attributes:
        tool_call_id: The ID matching the original ToolCall.id.
        content: String result or error message to send back to the LLM.
        is_error: Whether this represents an execution failure.
    """

    tool_call_id: str
    content: str
    is_error: bool = False


class ProviderNormalizer:
    """Normalizes tool call formats across LLM providers.

    Supports OpenAI (function_call format), Anthropic (tool_use block),
    and generic JSON format. Converts inbound calls to ToolCall and
    outbound results back to provider-specific format.
    """

    SUPPORTED_PROVIDERS = frozenset(["openai", "anthropic", "generic"])

    def normalize_inbound(
        self, raw_response: dict[str, Any], provider: str
    ) -> list[ToolCall]:
        """Convert a raw provider response into a list of ToolCall objects.

        Args:
            raw_response: The message/content from the LLM provider.
            provider: Provider name ('openai', 'anthropic', 'generic').

        Returns:
            List of normalized ToolCall instances.

        Raises:
            ValueError: If the response format is unrecognizable or malformed.
        """
        if provider not in self.SUPPORTED_PROVIDERS:
            raise ValueError(f"Unsupported provider: {provider}")

        normalizer = getattr(self, f"_normalize_{provider}", None)
        if normalizer is None:
            return self._normalize_generic(raw_response)

        return normalizer(raw_response)

    def format_outbound(self, result: ToolCallResult, provider: str) -> dict[str, Any]:
        """Convert a ToolCallResult back into provider-specific response format.

        Args:
            result: The execution result to format.
            provider: Target provider name.

        Returns:
            Dict ready to be sent as the next API request body.
        """
        formatter = getattr(self, f"_format_{provider}", None) or self._format_generic
        return formatter(result)

    # --- OpenAI format ---------------------------------------------------

    def _normalize_openai(self, response: dict[str, Any]) -> list[ToolCall]:
        """Parse OpenAI-style tool_calls from a chat completion message."""
        raw_tool_calls = response.get("tool_calls", [])

        if not raw_tool_calls:
            raise ValueError("No tool calls found in OpenAI response")

        tool_calls = []
        for tc in raw_tool_calls:
            tool_id = tc["id"]
            func = tc.get("function", {})
            raw_args = func.get("arguments", "{}")
            name = func.get("name", "unknown")

            try:
                arguments = json.loads(raw_args) if isinstance(raw_args, str) else raw_args
            except json.JSONDecodeError as e:
                raise ValueError(
                    f"OpenAI tool call '{name}' has invalid JSON: {e}"
                ) from e

            tool_calls.append(ToolCall(
                id=tool_id,
                name=name,
                arguments=arguments,
                raw_arguments=raw_args,
                provider="openai",
            ))

        return tool_calls

    # --- Anthropic format ------------------------------------------------

    def _normalize_anthropic(self, response: dict[str, Any]) -> list[ToolCall]:
        """Parse Anthropic-style tool_use blocks from a message content array."""
        content_blocks = response.get("content", [])
        if isinstance(content_blocks, str):
            content_blocks = [{"type": "text", "text": content_blocks}]

        tool_calls = []
        for block in content_blocks:
            if block.get("type") != "tool_use":
                continue

            tool_id = block["id"]
            name = block["name"]
            input_data = block.get("input", {})

            # Anthropic passes input as parsed dict directly (not JSON string)
            tool_calls.append(ToolCall(
                id=tool_id,
                name=name,
                arguments=input_data if isinstance(input_data, dict) else {},
                raw_arguments=json.dumps(input_data),
                provider="anthropic",
            ))

        return tool_calls

    # --- Generic / fallback format ---------------------------------------

    def _normalize_generic(self, response: dict[str, Any]) -> list[ToolCall]:
        """Parse a generic JSON-format tool call. Expects 'tool_calls' key."""
        raw_tool_calls = response.get("tool_calls", [])
        if not raw_tool_calls:
            # Try parsing content as structured JSON with explicit fields
            content = response.get("content", "")
            if content.startswith("{"):
                parsed = json.loads(content)
                return [ToolCall(
                    id=parsed.get("id", "generic-1"),
                    name=parsed.get("name", "unknown"),
                    arguments=parsed.get("arguments", {}),
                    raw_arguments=content,
                    provider="generic",
                )]
            raise ValueError("No tool calls found in generic response")

        return [
            ToolCall(
                id=tc.get("id", f"generic-{i}"),
                name=tc.get("name", "unknown"),
                arguments=tc.get("arguments", {}),
                raw_arguments=json.dumps(tc.get("arguments", {})),
                provider="generic",
            )
            for i, tc in enumerate(raw_tool_calls)
        ]

    # --- Outbound formatters ---------------------------------------------

    def _format_openai(self, result: ToolCallResult) -> dict[str, Any]:
        return {
            "role": "tool",
            "tool_call_id": result.tool_call_id,
            "content": result.content,
        }

    def _format_anthropic(self, result: ToolCallResult) -> list[dict[str, Any]]:
        return [{
            "type": "tool_result",
            "tool_use_id": result.tool_call_id,
            "content": result.content,
        }]

    def _format_generic(self, result: ToolCallResult) -> dict[str, Any]:
        return {
            "tool_call_id": result.tool_call_id,
            "content": result.content,
            "is_error": result.is_error,
        }
```

### Pattern 3: Retry + Fallback for Malformed Tool Calls

LLMs sometimes produce arguments that fail validation or omit required fields. This pattern retries with error feedback and falls back to safe defaults after exhaustion.

```python
"""Retry and fallback handling for unreliable LLM tool call arguments."""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Any, Callable

from pydantic import BaseModel

logger = logging.getLogger(__name__)


@dataclass
class ToolCallAttempt:
    """Tracks a single retry attempt of a tool call.

    Attributes:
        attempt_number: 1-indexed attempt count.
        raw_arguments: Original arguments from the LLM.
        error_message: Validation or execution error, if any.
        elapsed_seconds: Time spent on this attempt.
        succeeded: Whether this attempt produced valid arguments.
    """

    attempt_number: int
    raw_arguments: str | dict[str, Any]
    error_message: str | None = None
    elapsed_seconds: float = 0.0
    succeeded: bool = False


class ToolCallRetryHandler:
    """Manages retry logic for LLM tool calls that fail validation.

    Strategy: validate arguments -> on failure, feed error back to LLM -> retry.
    After max_retries exhausted, apply fallback values or return structured error.

    Args:
        max_retries: Maximum number of retry attempts (default 2).
        base_delay: Base delay in seconds between retries (default 0.5).
        max_delay: Cap on retry delay to avoid unbounded waits (default 3.0).
    """

    def __init__(
        self,
        max_retries: int = 2,
        base_delay: float = 0.5,
        max_delay: float = 3.0,
    ) -> None:
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay

    def execute_with_retry(
        self,
        tool_name: str,
        raw_arguments: str | dict[str, Any],
        validator: Callable[[str | dict[str, Any]], BaseModel],
        executor: Callable[[BaseModel], str],
        fallback_args: dict[str, Any] | None = None,
    ) -> ToolCallAttempt:
        """Run a tool call with retry on validation failure.

        On each failed attempt, the error message is returned to the LLM
        in a follow-up request so it can self-correct its argument format.

        Args:
            tool_name: Human-readable name of the tool being called.
            raw_arguments: Raw arguments from the LLM response.
            validator: Function that raises ValueError on invalid args.
            executor: Function that runs the tool with valid BaseModel args.
            fallback_args: Default values to use if all retries fail.

        Returns:
            ToolCallAttempt with success/failure details.
        """
        last_error: str | None = None
        attempts: list[ToolCallAttempt] = []

        for attempt_num in range(1, self.max_retries + 2):  # 1 initial + retries
            start = time.monotonic()

            try:
                valid_args = validator(raw_arguments)
                result = executor(valid_args)
                elapsed = time.monotonic() - start

                attempt = ToolCallAttempt(
                    attempt_number=attempt_num,
                    raw_arguments=raw_arguments,
                    succeeded=True,
                    elapsed_seconds=round(elapsed, 3),
                )
                attempts.append(attempt)
                logger.info(
                    "Tool '%s' succeeded on attempt %d (%.2fs)",
                    tool_name, attempt_num, elapsed,
                )
                return attempt

            except ValueError as e:
                elapsed = time.monotonic() - start
                last_error = str(e)
                attempts.append(ToolCallAttempt(
                    attempt_number=attempt_num,
                    raw_arguments=raw_arguments,
                    error_message=last_error,
                    elapsed_seconds=round(elapsed, 3),
                ))

                if attempt_num > self.max_retries:
                    logger.warning(
                        "Tool '%s' exhausted %d retries. Last error: %s",
                        tool_name, self.max_retries, last_error,
                    )
                    break

                # Exponential backoff with jitter cap
                delay = min(
                    self.base_delay * (2 ** (attempt_num - 1)),
                    self.max_delay,
                )
                time.sleep(delay)

        # All retries exhausted — apply fallback or return error
        if fallback_args is not None:
            try:
                valid_args = validator(fallback_args)
                executor(valid_args)
                logger.info(
                    "Tool '%s' used fallback args after %d failures",
                    tool_name, self.max_retries,
                )
                return attempts[-1]
            except Exception as e:
                last_error = f"Fallback also failed: {e}"

        return ToolCallAttempt(
            attempt_number=len(attempts),
            raw_arguments=raw_arguments,
            error_message=last_error or "Unknown error after all retries",
            succeeded=False,
        )
```

### Pattern 4: Safety Guardrails for Tool Access

Control which tools the LLM can invoke and under what conditions. Prevents unauthorized tool access through prompt injection or adversarial queries.

```python
"""Safety guardrails that constrain what tools an LLM can invoke."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)


class AccessDecision(Enum):
    """Decision from a tool access guardrail check.

    Attributes:
        ALLOWED: Tool call proceeds normally.
        DENIED: Tool call blocked with a reason.
        MODIFY: Tool call allowed but arguments altered by policy.
    """

    ALLOWED = "allowed"
    DENIED = "denied"
    MODIFY = "modify"


@dataclass
class GuardrailResult:
    """Result of running safety guardrails on a tool call.

    Attributes:
        decision: Whether to allow, deny, or modify the call.
        reason: Human-readable explanation for the decision.
        modified_arguments: Arguments after guardrail modifications (if any).
        blocked_tool_name: Name of denied tool, if applicable.
    """

    decision: AccessDecision
    reason: str
    modified_arguments: dict[str, Any] | None = None
    blocked_tool_name: str | None = None


class ToolGuardrails:
    """Enforces access policies on LLM tool invocations.

    Supports allowlists, parameter sanitization, rate limiting hints,
    and dangerous tool blocking (e.g., file writes, shell commands).
    """

    DANGEROUS_PATTERNS = frozenset([
        "shell", "exec", "system_command", "write_file",
        "delete_file", "run_code", "eval_", "import_os",
    ])

    def __init__(
        self,
        allowlist: set[str] | None = None,
        denylist: set[str] | None = None,
        max_args_per_tool: int = 16,
    ) -> None:
        self._allowlist = allowlist or set()
        self._denylist = denylist or set()
        self.max_args_per_tool = max_args_per_tool

    def check(
        self,
        tool_name: str,
        arguments: dict[str, Any],
    ) -> GuardrailResult:
        """Run all guardrails on a proposed tool call.

        Checks are applied in order: allowlist -> denylist -> argument size.
        The first denial wins; only the last ALLOWED check returns success.

        Args:
            tool_name: Name of the tool to invoke.
            arguments: Parsed and validated arguments dict.

        Returns:
            GuardrailResult with decision, reason, and optional modifications.
        """
        # Check 1: Allowlist (if configured, blocks everything not listed)
        if self._allowlist:
            if tool_name not in self._allowlist:
                return GuardrailResult(
                    decision=AccessDecision.DENIED,
                    reason=f"Tool '{tool_name}' is not in the allowlist",
                    blocked_tool_name=tool_name,
                )

        # Check 2: Denylist
        lower_name = tool_name.lower()
        if lower_name in self._denylist:
            return GuardrailResult(
                decision=AccessDecision.DENIED,
                reason=f"Tool '{tool_name}' is explicitly blocked",
                blocked_tool_name=tool_name,
            )

        # Check 3: Dangerous tool name patterns
        for pattern in self.DANGEROUS_PATTERNS:
            if pattern in lower_name:
                return GuardrailResult(
                    decision=AccessDecision.DENIED,
                    reason=(
                        f"Tool '{tool_name}' matches dangerous pattern "
                        f"'{pattern}' - blocked by safety policy"
                    ),
                    blocked_tool_name=tool_name,
                )

        # Check 4: Argument count limit
        if len(arguments) > self.max_args_per_tool:
            return GuardrailResult(
                decision=AccessDecision.MODIFY,
                reason=(
                    f"Tool '{tool_name}' has {len(arguments)} arguments "
                    f"(max {self.max_args_per_tool}). Truncating to first {self.max_args_per_tool}."
                ),
                modified_arguments=dict(list(arguments.items())[: self.max_args_per_tool]),
            )

        return GuardrailResult(
            decision=AccessDecision.ALLOWED,
            reason="All guardrails passed",
        )

    def get_active_allowlist(self) -> set[str]:
        """Return a copy of the current allowlist. Empty means all tools are allowed."""
        return set(self._allowlist)
```

---

## Constraints

### MUST DO
- Always validate LLM-generated arguments with Pydantic v2 before executing any tool
- Use `model_json_schema()` to auto-generate tool parameter schemas from Pydantic models
- Return structured error messages to the LLM on validation failure (include field names and types)
- Keep each tool definition focused: one responsibility, clear description, <= 8 parameters
- Implement retry logic that feeds back validation errors so the LLM can self-correct
- Apply guardrail checks before every tool invocation — never trust the model blindly
- Use `json.loads()` with try/except to handle non-string raw arguments gracefully

### MUST NOT DO
- Execute a tool call without first validating its arguments against the schema
- Pass raw LLM output directly into `exec()`, `eval()`, or shell commands
- Bypass guardrails because "the model is unlikely to misuse tools"
- Hardcode provider-specific tool formats — always use the normalization layer
- Use string concatenation to build JSON parameter schemas — always use Pydantic or `jsonschema`
- Return Python traceback strings as error messages to the LLM — sanitize all errors

---

## Related Skills

| Skill | Purpose |
|---|---|
| `anthropic-api` | Provider-specific tool use with Anthropic's Messages API and SDK |
| `agent-security-guardrails` | Prompt injection detection, input validation, and output sanitization for agent security |
| `api-design` | Production REST API design including Pydantic validation patterns |
| `agent-debugging` | Systematic debugging of LLM agent failures including tool call errors |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references.

- [OpenAI Function Calling Guide](https://platform.openai.com/docs/guides/function-calling)
- [Anthropic Tool Use Documentation](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview)
- [Pydantic v2 Model Validation](https://docs.pydantic.dev/latest/concepts/validation/)
- [JSON Schema Draft 2020-12 Specification](https://json-schema.org/draft/2020-12/schema)
- [OpenRouter Tool Use Guide](https://openrouter.ai/docs/function-calling)
- [Pydantic JSON Schema Generation](https://docs.pydantic.dev/latest/concepts/json_schema/)
