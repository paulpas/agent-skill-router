---
name: agent-tool-calling-architecture
description: Implements tool calling architecture (Pydantic schemas, function-to-schema conversion, output parsing with error recovery, parallel execution with fallback chains) for LLM agents in Python.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  role: implementation
  scope: implementation
  output-format: code
  archetypes: [tactical]
  anti_triggers: [brainstorming, vague ideation, long-form architecture]
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  triggers: tool calling, function calling, tool use architecture, pydantic schema, output parsing, error recovery, tool fallback chain, how do i make my agent use tools
  related-skills: agent-memory-systems,agent-planning-reasoning,langchain
---

# Agent Tool Calling Architecture

Implements the complete tool calling pipeline for LLM agents — from Pydantic-based tool definitions through function-to-schema conversion, error-resilient output parsing, parallel execution with fallback chains. When loaded, this skill makes the model produce production-grade tool architecture code extracted from LangChain, LangGraph, CrewAI, and OpenAI SDK patterns.

## TL;DR Checklist

- [ ] All tools use Pydantic models for argument schemas with typed signatures
- [ ] Function-to-OpenAI schema conversion handles Pydantic v1 and v2 via `model_json_schema()` / `schema()`
- [ ] Output parser handles partial JSON (streaming), empty arguments, and invalid JSON with proper exceptions
- [ ] Tool execution node runs calls in parallel using `get_executor_for_config`
- [ ] Each tool call is wrapped in try/except returning ToolMessage error feedback
- [ ] Fallback chains are initialized with at least 2 tools and a max fallback count

---

## When to Use

Use this skill when:

- Designing or implementing the tool calling layer for an LLM agent
- Converting Python functions or Pydantic models into OpenAI-compatible JSON schemas
- Building output parsers that handle streaming (partial JSON) and invalid model outputs gracefully
- Implementing a ToolNode-style executor that runs parallel tool calls with error feedback
- Setting up fallback chains where primary tools can fall back to secondary heuristics

## When NOT to Use

Avoid this skill for:

- Simple API wrappers without agent integration (just use the raw SDK)
- Prompt engineering without structured tool invocation
- Non-agent LLM workflows that don't need function calling
- Implementing memory systems (use `agent-memory-systems` instead)

---

## Core Workflow

1. **Define Tools with Pydantic Schemas** — Create a `BaseTool` subclass with `name`, `description`, and `args_schema` fields. Use Pydantic's `model_json_schema()` for automatic OpenAI-compatible schema generation. **Checkpoint:** Verify `args_schema` produces valid JSON via `.model_json_schema()`.

2. **Convert Functions to OpenAI Schema** — If using plain Python functions, apply `convert_python_function_to_openai_function()` which extracts type hints and docstrings into `FunctionDescription` dicts. For Pydantic models, use `convert_pydantic_to_openai_function()`. **Checkpoint:** Verify schema has `name`, `description`, `parameters` keys with `$defs` removed.

3. **Parse Tool Calls from LLM Output** — Use `JsonOutputToolsParser` to parse `tool_calls` from `AIMessage`. Handle partial JSON during streaming via `parse_partial_json()`. Wrap invalid JSON in `OutputParserException` with the raw arguments for debugging. **Checkpoint:** Verify parser returns list of dicts with `name`, `args`, optional `id` keys.

4. **Execute Tools in Parallel with Error Handling** — Use `ToolNode.__call__()` to extract all `tool_calls` from messages, submit each via thread pool executor, collect results. Each call is wrapped: `ValueError` for unregistered tools → error message with available tool names; `ToolException` → direct message pass-through; any other exception → formatted error template. **Checkpoint:** Verify parallel execution completes even if individual tools fail — all ToolMessages are returned.

5. **Set Up Fallback Chains** — Initialize `ToolFallbackChain` with ordered tools list. On first tool failure (matching `fallback_on` exceptions), recurse to next tool. Maximum fallback attempts bounded by `max_fallback_attempts`. **Checkpoint:** Verify chain raises `RuntimeError` after exhausting all tools.

---

## Implementation Patterns

### Pattern 1: Typed Tool Definitions with Pydantic Schemas

Modern tool definitions use Pydantic models as both validation and schema generation. This ensures type safety from definition through execution. Every tool declares its name, description, and argument schema using Pydantic models.

```python
# Source: crewAIInc/crewAI — lib/crewai/src/crewai/tools/base_tool.py
from __future__ import annotations

from abc import ABC, abstractmethod
import asyncio
from collections.abc import Awaitable, Callable
from typing import (
    Any,
    Generic,
    ParamSpec,
    TypeVar,
    overload,
)

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    GetCoreSchemaHandler,
    PrivateAttr,
    field_serializer,
    field_validator,
)
from typing_extensions import TypeIs


P = ParamSpec("P")
R = TypeVar("R", covariant=True)


class BaseTool(BaseModel, ABC):
    """Base class for tools that LLM agents can invoke.

    Tools are the primary mechanism by which agents interact with external
    systems (APIs, databases, file systems). Each tool declares its name,
    description, and argument schema using Pydantic models.

    Attributes:
        name: Unique identifier used by the model to select this tool.
        description: Human-readable description that guides tool selection.
        args_schema: Pydantic model defining accepted arguments and their types.
        env_vars: Optional list of environment variables the tool requires.
    """

    model_config = ConfigDict(arbitrary_types_allowed=True)

    name: str = Field(
        description="The unique name of the tool that clearly communicates its purpose."
    )
    description: str = Field(
        description="Used to tell the model how/when/why to use the tool."
    )
    env_vars: list[EnvVar] = Field(
        default_factory=list,
        description="List of environment variables used by the tool.",
    )
    args_schema: type[PydanticBaseModel] = Field(
        default=_ArgsSchemaPlaceholder,
        validate_default=True,
        description="The schema for the arguments that the tool accepts.",
    )

    @field_validator("name", mode="after")
    @classmethod
    def name_must_be_lowercase(cls, v: str) -> str:
        """Enforce kebab-case or snake_case naming conventions."""
        return v.lower()

    async def _arun(self, *args: Any, **kwargs: Any) -> Any:
        """Async execution — override for async tools."""
        raise NotImplementedError("Async tools must implement _arun")

    def _run(self, *args: Any, **kwargs: Any) -> Any:
        """Sync execution — override for sync tools."""
        raise NotImplementedError("Sync tools must implement _run")

    @classmethod
    def from_defaults(
        cls,
        name: str,
        description: str,
        args_schema: type[BaseModel],
        **kwargs: Any,
    ) -> BaseTool:
        """Create a tool from declarative configuration."""
        raise NotImplementedError
```

### Pattern 2: Function-to-OpenAI-Schema Conversion

LangChain converts Python functions with type hints into OpenAI-compatible JSON schemas automatically. This works for both plain `Callable` objects and Pydantic models.

```python
# Source: langchain-ai/langchain — libs/core/langchain_core/utils/function_calling.py
"""Methods for creating function specs in the style of OpenAI Functions."""

from __future__ import annotations

import collections
import inspect
import logging
import types
from typing import (
    TYPE_CHECKING,
    Annotated,
    Any,
    Literal,
    Union,
    cast,
    get_args,
    get_origin,
    get_type_hints,
)

from pydantic import BaseModel
from typing_extensions import TypedDict

PYTHON_TO_JSON_TYPES: dict[type, str] = {
    "str": "string",
    "int": "integer",
    "float": "number",
    "bool": "boolean",
}


class FunctionDescription(TypedDict):
    """Representation of a callable function to send to an LLM."""
    name: str
    description: str
    parameters: dict


class ToolDescription(TypedDict):
    """Representation of a callable function to the OpenAI API."""
    type: Literal["function"]
    function: FunctionDescription


def convert_python_function_to_openai_function(
    function: Callable,
) -> FunctionDescription:
    """Convert a Python function to an OpenAI function-calling API compatible dict.

    Assumes the Python function has type hints and a docstring with a description.
    If the docstring has Google Python style argument descriptions, these will be
    included as well.

    Args:
        function: The Python function to convert.

    Returns:
        The OpenAI function description dict suitable for the tools parameter.
    """
    func_name = function.__name__
    model = create_schema_from_function(
        func_name,
        function,
        filter_args=(),
        parse_docstring=True,
        error_on_invalid_docstring=False,
        include_injected=False,
    )
    return _convert_pydantic_to_openai_function(
        model, name=func_name, description=model.__doc__
    )


def convert_pydantic_to_openai_function(
    model: type,
    *,
    name: str | None = None,
    description: str | None = None,
    rm_titles: bool = True,
) -> FunctionDescription:
    """Converts a Pydantic model to a function description for the OpenAI API.

    Args:
        model: The Pydantic model to convert.
        name: The name of the function. If not provided, uses model title.
        description: Description text. Uses model docstring if not provided.
        rm_titles: Whether to strip 'title' fields from JSON schema.

    Returns:
        FunctionDescription dict ready for OpenAI API tools parameter.

    Raises:
        TypeError: If model is not a Pydantic model.
        PydanticInvalidForJsonSchema: If model contains non-JSON-serializable types.
    """
    try:
        if hasattr(model, "model_json_schema"):
            schema = model.model_json_schema()  # Pydantic 2
        elif hasattr(model, "schema"):
            schema = model.schema()  # Pydantic 1
        else:
            raise TypeError("Model must be a Pydantic model.")
    except PydanticInvalidForJsonSchema as e:
        model_name = getattr(model, "__name__", str(model))
        msg = (
            f"Failed to generate JSON schema for '{model_name}': {e}\n\n"
            "Tool argument schemas must be JSON-serializable. Consider:\n"
            "  1. Converting custom classes to Pydantic models\n"
            "  2. Using primitive types (str, int, float, bool)\n"
            "  3. Passing data as serialized JSON strings"
        )
        raise PydanticInvalidForJsonSchema(msg) from e

    schema = dereference_refs(schema)
    if "$defs" in schema:
        schema.pop("$defs")
    return {
        "name": name or schema.pop("title", ""),
        "description": description or schema.pop("description", ""),
        "parameters": remove_titles(schema) if rm_titles else schema,
    }
```

### Pattern 3: Output Parsing with Error Recovery

Modern parsers handle partial JSON (streaming), invalid calls, and malformed arguments gracefully. This is critical because LLMs frequently produce incomplete or slightly broken JSON during generation.

```python
# Source: langchain-ai/langchain — libs/core/langchain_core/output_parsers/openai_tools.py
"""Parse tools from OpenAI response."""

from json import JSONDecodeError
from typing import Annotated, Any

from pydantic import SkipValidation, ValidationError

from langchain_core.exceptions import OutputParserException
from langchain_core.messages import AIMessage, InvalidToolCall
from langchain_core.output_parsers.transform import BaseCumulativeTransformOutputParser
from langchain_core.outputs import ChatGeneration, Generation
from langchain_core.utils.json import parse_partial_json


def parse_tool_call(
    raw_tool_call: dict[str, Any],
    *,
    partial: bool = False,
    strict: bool = False,
    return_id: bool = True,
) -> dict[str, Any] | None:
    """Parse a single tool call from LLM response.

    Args:
        raw_tool_call: Raw tool call dict from OpenAI API response.
        partial: If True, attempt to parse incomplete JSON (streaming).
        strict: If True, enforce strict JSON compliance.
        return_id: Include tool call ID in result.

    Returns:
        Parsed tool call dict with 'name', 'args', optional 'id'.

    Raises:
        OutputParserException: If arguments are not valid JSON.
    """
    if "function" not in raw_tool_call:
        return None

    arguments = raw_tool_call["function"]["arguments"]

    if partial:
        try:
            function_args = parse_partial_json(arguments, strict=strict)
        except (JSONDecodeError, TypeError):
            return None  # Skip incomplete calls during streaming
    elif not arguments:
        function_args = {}  # Handle parameter-less tools
    else:
        try:
            function_args = json.loads(arguments, strict=strict)
        except JSONDecodeError as e:
            msg = (
                f"Function {raw_tool_call['function']['name']} arguments:\n\n"
                f"{arguments}\n\nare not valid JSON. "
                f"Received JSONDecodeError {e}"
            )
            raise OutputParserException(msg) from e

    parsed: dict[str, Any] = {
        "name": raw_tool_call["function"]["name"] or "",
        "args": function_args or {},
    }
    if return_id:
        parsed["id"] = raw_tool_call.get("id")
    return parsed


def make_invalid_tool_call(
    raw_tool_call: dict[str, Any],
    error_msg: str | None,
) -> InvalidToolCall:
    """Create an InvalidToolCall message for error reporting.

    Args:
        raw_tool_call: The failed tool call from the LLM.
        error_msg: Human-readable error description.

    Returns:
        InvalidToolCall message suitable for re-sending to model.
    """
    return invalid_tool_call(
        name=raw_tool_call["function"]["name"],
        args=raw_tool_call["function"]["arguments"],
        id=raw_tool_call.get("id"),
        error=error_msg,
    )


class JsonOutputToolsParser(BaseCumulativeTransformOutputParser[Any]):
    """Parse tools from OpenAI response with streaming support.

    Handles both complete and partial (streaming) tool call parsing.
    Returns list of tool calls or a single call if first_tool_only=True.
    """

    strict: bool = False
    return_id: bool = False
    first_tool_only: bool = False

    def parse_result(self, result: list[Generation], *, partial: bool = False) -> Any:
        """Parse the result of an LLM call to a list of tool calls.

        Args:
            result: ChatGeneration objects from model invocation.
            partial: If True, parse incomplete JSON during streaming.

        Returns:
            List of parsed tool call dicts, or None if first_tool_only and empty.
        """
        generation = result[0]
        if not isinstance(generation, ChatGeneration):
            raise OutputParserException(
                "This output parser can only be used with a chat generation."
            )

        message = generation.message
        if isinstance(message, AIMessage) and message.tool_calls:
            tool_calls = [dict(tc) for tc in message.tool_calls]
            for tc in tool_calls:
                if not self.return_id:
                    tc.pop("id", None)
        else:
            try:
                raw_tool_calls = message.additional_kwargs["tool_calls"]
            except KeyError:
                return []
            tool_calls = parse_tool_calls(
                raw_tool_calls, partial=partial, strict=self.strict
            )

        # Normalize format for backward compatibility
        for tc in tool_calls:
            tc["type"] = tc.pop("name")

        if self.first_tool_only:
            return tool_calls[0] if tool_calls else None
        return tool_calls
```

### Pattern 4: Tool Execution with Error Handling & Fallback

The modern approach runs tools in parallel (when the model requests multiple) and wraps each in error handling, feeding errors back to the LLM for self-correction. This is LangGraph's `ToolNode`.

```python
# Source: langchain-ai/langgraph — libs/prebuilt/langgraph/prebuilt/tool_node.py
"""Tool execution node for LangGraph workflows."""

from __future__ import annotations

import asyncio
import inspect
from dataclasses import dataclass, field
from typing import (
    Annotated,
    Any,
    Generic,
    TypedDict,
    TypeVar,
    get_type_hints,
)

from langchain_core.messages import ToolCall, ToolMessage
from langchain_core.runnables.config import get_config_list, get_executor_for_config
from langchain_core.tools import BaseTool, ToolException
from pydantic import BaseModel, ValidationError


# Error templates for LLM feedback
TOOL_CALL_ERROR_TEMPLATE = "Error: {error}\n Please fix your mistakes."
TOOL_EXECUTION_ERROR_TEMPLATE = (
    "Error executing tool '{tool_name}' with kwargs {tool_kwargs} with error:\n"
    " {error}\n  Please fix the error and try again."
)
INVALID_TOOL_NAME_ERROR_TEMPLATE = (
    "Error: {requested_tool} is not a valid tool, "
    "try one of [{available_tools}]."
)


StateT = TypeVar("StateT", default=dict)
ContextT = TypeVar("ContextT", default=None)


@dataclass
class ToolCallRequest:
    """Tool execution request passed to tool call interceptors.

    Attributes:
        tool_call: Tool call dict with name, args, and id from model output.
        tool: BaseTool instance to be invoked, or None if unregistered.
        state: Agent state (dict, list, or BaseModel).
        runtime: LangGraph runtime context (optional).
    """
    tool_call: ToolCall
    tool: BaseTool | None
    state: Any
    runtime: "ToolRuntime"


class ToolNode:
    """Prebuilt node for executing tools in LangGraph workflows.

    Key behaviors:
    - Runs multiple tool calls from a single model response in PARALLEL when possible
    - Wraps each execution in try/except, returning errors as ToolMessage feedback
    - Handles ToolException specially to suppress stack traces from LLM context
    - Supports InjectedState and InjectedStore annotations for tools needing context

    Usage:
        tool_node = ToolNode([my_search_tool, my_db_query_tool])
        # In a graph: .add_node("tools", tool_node)
    """

    def __init__(
        self,
        tools: Sequence[BaseTool],
        *,
        name: str = "tools",
        tags: list[str] | None = None,
    ) -> None:
        self.tools = list(tools)
        self.tool_map = {t.name: t for t in self.tools}
        self.name = name
        self.tags = tags or []

    def _handle_tool_error(
        self, error: Exception, *, tool_call: ToolCall, tool_name: str | None
    ) -> ToolMessage:
        """Convert an execution error into a ToolMessage for LLM feedback.

        Special handling: if the error is a ToolException, return its message directly.
        Otherwise, use the generic error template with context.

        Args:
            error: The caught exception.
            tool_call: The original tool call dict.
            tool_name: Name of the tool that failed (None = unregistered tool).

        Returns:
            ToolMessage with error information for re-sending to model.
        """
        if isinstance(error, ToolException):
            error_msg = str(error)
        elif tool_name is None:
            # Tool not registered - tell the model what tools ARE available
            available = ", ".join(self.tool_map.keys())
            error_msg = INVALID_TOOL_NAME_ERROR_TEMPLATE.format(
                requested_tool=tool_call.get("name", "unknown"),
                available_tools=available,
            )
        else:
            tool_kwargs = tool_call.get("args", {})
            error_msg = TOOL_EXECUTION_ERROR_TEMPLATE.format(
                tool_name=tool_name,
                tool_kwargs=tool_kwargs,
                error=str(error),
            )

        return ToolMessage(
            content=TOOL_CALL_ERROR_TEMPLATE.format(error=error_msg),
            name=tool_call.get("name"),
            tool_call_id=tool_call["id"],
        )

    def _run_tool(self, tool_call: ToolCall) -> ToolMessage:
        """Execute a single tool call and return the result as a ToolMessage.

        Args:
            tool_call: Dict with 'name', 'args', and 'id' keys.

        Returns:
            ToolMessage containing either the tool output or error message.
        """
        tool_name = tool_call.get("name")
        tool = self.tool_map.get(tool_name)

        try:
            if tool is None:
                return self._handle_tool_error(
                    ValueError(f"Tool '{tool_name}' not found"),
                    tool_call=tool_call,
                    tool_name=tool_name,
                )

            # Validate and convert args using the tool's Pydantic schema
            result = tool.invoke(tool_call["args"])
            return ToolMessage(
                content=str(result),
                name=tool_name,
                tool_call_id=tool_call["id"],
            )

        except Exception as e:
            return self._handle_tool_error(e, tool_call=tool_call, tool_name=tool_name)

    def __call__(self, messages: list[Any]) -> list[ToolMessage]:
        """Execute all tool calls in messages. Parallel execution for multiple calls.

        Args:
            messages: Message list containing AIMessages with tool_calls.

        Returns:
            List of ToolMessages, one per tool call.
        """
        tool_calls: list[ToolCall] = []
        for msg in messages:
            if isinstance(msg, AIMessage) and msg.tool_calls:
                tool_calls.extend(msg.tool_calls)

        # Execute ALL tool calls in parallel for efficiency
        results: list[ToolMessage] = []
        with get_executor_for_config({}) as executor:
            futures = [
                executor.submit(self._run_tool, tc) for tc in tool_calls
            ]
            for future in futures:
                results.append(future.result())

        return results
```

### Pattern 5: Tool Fallback Chains

A fallback chain tries tools in order of preference. When a primary tool fails (e.g., API rate limit, missing data), a secondary tool provides partial results. This is useful for: expensive LLM-powered → simple heuristic, real-time API → cached/stale data, premium model → cheaper/faster model.

```python
# Source: AI Agent Research 2026 — Tool Fallback Chains pattern
from typing import Any
from langchain_core.tools import BaseTool, tool


class ToolFallbackChain:
    """Implements a fallback chain for tool execution.

    When the primary tool raises a recoverable error, the next tool in the
    chain is tried with the same arguments. Useful for:
    - Primary: expensive LLM-powered tool, Fallback: simple heuristic
    - Primary: real-time API, Fallback: cached/stale data
    - Primary: premium model endpoint, Fallback: cheaper/faster model
    """

    def __init__(
        self,
        tools: list[BaseTool],
        *,
        fallback_on: tuple[type[Exception], ...] = (Exception,),
        max_fallback_attempts: int = 3,
    ) -> None:
        """Initialize fallback chain.

        Args:
            tools: Ordered list of tools to try. First is primary.
            fallback_on: Exception types that trigger fallback.
            max_fallback_attempts: Maximum number of fallback transitions.
        """
        if len(tools) < 2:
            raise ValueError("Fallback chain requires at least 2 tools")
        self.tools = tools
        self.fallback_on = fallback_on
        self.max_fallback_attempts = max_fallback_attempts

    def invoke(
        self, args: dict[str, Any], *, attempt: int = 0
    ) -> str:
        """Invoke the tool chain with fallback logic.

        Args:
            args: Arguments to pass to each tool.
            attempt: Current attempt number (internal use).

        Returns:
            Output from the first successful tool invocation.

        Raises:
            RuntimeError: If all tools in the chain fail.
        """
        if attempt >= len(self.tools):
            raise RuntimeError(
                f"All {len(self.tools)} tools in fallback chain failed"
            )

        current_tool = self.tools[attempt]

        try:
            return current_tool.invoke(args)

        except self.fallback_on as e:
            # Log the failure for observability
            print(f"[FallbackChain] Tool '{current_tool.name}' failed: {e}")
            # Recurse to next tool in chain
            return self.invoke(args, attempt=attempt + 1)
```

---

## Constraints

### MUST DO
- Use Pydantic `BaseModel` for all tool argument schemas — never raw dicts or `Any` types
- Always strip `$defs` from generated JSON schemas before sending to LLM APIs
- Handle partial/invalid JSON during streaming with `parse_partial_json()`, returning `None` for incomplete calls
- Wrap every tool execution in try/except and return errors as `ToolMessage` objects — never let exceptions escape the ToolNode
- Use parallel execution via thread pool executor when multiple tool calls are present in a single model response
- Initialize fallback chains with at least 2 tools and always bound max_fallback_attempts to prevent runaway recursion

### MUST NOT DO
- Never skip error handling for individual tool calls — every tool must have its result wrapped in ToolMessage
- Never use string-based action parsing (old ReAct "Action: X, Action Input: Y") when native tool calling is available
- Never omit the `name` field validation — enforce lowercase naming via `field_validator` to match LLM expectations
- Never allow unbounded fallback chains — always set a maximum number of fallback attempts
- Never mutate tool schemas after they are bound to a model — schema changes require rebinding

---

## Output Template

When implementing or reviewing agent tool calling code, produce:

1. **Tool Definition** — Pydantic-based `BaseTool` subclass with `name`, `description`, `args_schema`, and typed `_run`/`_arun` methods
2. **Schema Conversion** — Either `convert_pydantic_to_openai_function()` or `convert_python_function_to_openai_function()` output showing the generated JSON schema
3. **Parser Configuration** — `JsonOutputToolsParser` instance with streaming/error mode flags configured
4. **ToolNode Setup** — Parallel executor configuration with error templates and tool map
5. **Fallback Chain** — Ordered tool list with fallback exception types and max attempts

---

## Related Skills

| Skill | Purpose |
|---|---|
| `agent-memory-systems` | Manage conversation history and long-term memory for agents that use these tools |
| `agent-planning-reasoning` | Implement ReAct planning loops and self-reflection that invoke these tools iteratively |
| `langchain` | Broader LangChain/LangGraph patterns including chains, RAG, and agent frameworks |
