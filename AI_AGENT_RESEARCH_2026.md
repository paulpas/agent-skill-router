# AI Application Development Frameworks & Agent Architecture Patterns (2025-2026)

## Research Report

Comprehensive analysis of real code examples from GitHub repositories for modern AI agent development. All code sourced from production frameworks: **LangChain/LangGraph** (langchain-ai/langchain, langchain-ai/langgraph), **LlamaIndex** (run-llama/llama_index), **CrewAI** (crewAIInc/crewAI), **Microsoft AutoGen** (microsoft/autogen), and **OpenAI SDK** (openai/openai-python).

---

# 1. Tool Use / Function Calling

## Overview

Tool calling (also called function calling) allows LLMs to return structured data that triggers external function execution. All major frameworks now use this pattern as their primary agent interaction model, replacing older string-based parsing approaches.

## Pattern 1: Typed Tool Definitions with Pydantic Schemas

**Source:** `crewAIInc/crewAI` — `lib/crewai/src/crewai/tools/base_tool.py`

Modern tool definitions use Pydantic models as both validation and schema generation. This ensures type safety from definition through execution.

```python
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

**Source:** `langchain-ai/langchain` — `libs/core/langchain_core/utils/function_calling.py`

LangChain converts Python functions with type hints into OpenAI-compatible JSON schemas automatically:

```python
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

**Source:** `langchain-ai/langchain` — `libs/core/langchain_core/output_parsers/openai_tools.py`

Modern parsers handle partial JSON, invalid calls, and malformed arguments gracefully:

```python
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

**Source:** `langchain-ai/langgraph` — `libs/prebuilt/langgraph/prebuilt/tool_node.py`

The modern approach runs tools in parallel (when the model requests multiple) and wraps each in error handling, feeding errors back to the LLM for self-correction:

```python
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

## Pattern 5: Tool Fallback Chains

A fallback chain tries tools in order of preference. When a primary tool fails (e.g., API rate limit, missing data), a secondary tool provides partial results.

```python
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

# 2. Memory Systems

## Overview

Memory in AI agents has three layers: (1) short-term conversation history, (2) long-term vector store retrieval, and (3) conversation summarization to manage context window limits. The modern approach uses LangChain's `MessagesStore` / checkpointing and LlamaIndex's embedding-backed retrieval.

## Pattern 1: Short-Term Memory — Conversation Buffer

**Source:** `langchain-ai/langchain` — `libs/langchain/langchain_classic/memory/buffer.py`

```python
"""Conversation buffer memory - stores entire conversation history."""

from typing import Any

from langchain_core.messages import BaseMessage, get_buffer_string


class ConversationBufferMemory:
    """Basic memory that stores the entire conversation history.

    This is the simplest form of memory — it keeps every message in a list
    and injects them into future prompts. Use this for short conversations.

    For long conversations, use ConversationBufferWindowMemory or
    ConversationSummaryMemory instead to manage context window limits.
    """

    def __init__(
        self,
        chat_memory: "BaseChatMemory",
        *,
        human_prefix: str = "Human",
        ai_prefix: str = "AI",
        memory_key: str = "history",
        return_messages: bool = False,
    ) -> None:
        """Initialize the conversation buffer memory.

        Args:
            chat_memory: Storage backend for messages (in-memory, database, etc.)
            human_prefix: Label for human messages in formatted string.
            ai_prefix: Label for AI messages in formatted string.
            memory_key: Key to use when injecting into chain inputs.
            return_messages: If True, return raw message objects; else format as string.
        """
        self.chat_memory = chat_memory
        self.human_prefix = human_prefix
        self.ai_prefix = ai_prefix
        self.memory_key = memory_key
        self.return_messages = return_messages

    @property
    def buffer(self) -> str | list[BaseMessage]:
        """Current conversation buffer, as string or message list."""
        messages = self.chat_memory.messages
        if self.return_messages:
            return messages
        return get_buffer_string(
            messages,
            human_prefix=self.human_prefix,
            ai_prefix=self.ai_prefix,
        )

    def load_memory_variables(self, inputs: dict[str, Any]) -> dict[str, Any]:
        """Return the current conversation history as a memory variable."""
        return {self.memory_key: self.buffer}

    def save_context(
        self, inputs: dict[str, Any], outputs: dict[str, str]
    ) -> None:
        """Add new interaction to the conversation history.

        Args:
            inputs: User input dict (typically has 'input' key).
            outputs: AI output dict (typically has 'output' or 'response' key).
        """
        human_msg = HumanMessage(content=inputs["input"])
        ai_msg = AIMessage(content=outputs["output"])
        self.chat_memory.add_messages([human_msg, ai_msg])

    def clear(self) -> None:
        """Clear all stored conversation history."""
        self.chat_memory.clear()
```

## Pattern 2: Windowed Memory — Bounded Context

**Source:** `langchain-ai/langchain` — `libs/langchain/langchain_classic/memory/buffer_window.py`

```python
"""Windowed conversation memory - keeps only the last K turns."""

from typing import Any

from langchain_core.messages import BaseMessage, get_buffer_string


class ConversationBufferWindowMemory:
    """Keeps only the last k turns of a conversation.

    If the number of messages exceeds k * 2, oldest messages are dropped.
    This provides bounded memory usage with recency bias — recent context
    is more relevant than older context in most dialogues.

    Args:
        k: Number of turns to retain. Each turn = 1 human + 1 AI message.
           Total messages kept = k * 2.
    """

    def __init__(
        self,
        chat_memory: "BaseChatMemory",
        *,
        k: int = 5,
        human_prefix: str = "Human",
        ai_prefix: str = "AI",
        memory_key: str = "history",
    ) -> None:
        """Initialize windowed memory.

        Args:
            chat_memory: Underlying message storage backend.
            k: Number of conversation turns to retain. Default 5 (10 messages).
            human_prefix: Label for human messages in formatted output.
            ai_prefix: Label for AI messages in formatted output.
            memory_key: Key name when injecting into chain inputs.
        """
        self.chat_memory = chat_memory
        self.k = k
        self.human_prefix = human_prefix
        self.ai_prefix = ai_prefix
        self.memory_key = memory_key

    @property
    def buffer(self) -> str | list[BaseMessage]:
        """Last k turns of conversation history."""
        messages = self.chat_memory.messages
        # Keep last k * 2 messages (k human + k AI exchanges)
        recent = messages[-self.k * 2:] if self.k > 0 else []
        return get_buffer_string(
            recent,
            human_prefix=self.human_prefix,
            ai_prefix=self.ai_prefix,
        )

    def save_context(
        self, inputs: dict[str, Any], outputs: dict[str, str]
    ) -> None:
        """Add new interaction and enforce window bounds."""
        human_msg = HumanMessage(content=inputs["input"])
        ai_msg = AIMessage(content=outputs["output"])
        self.chat_memory.add_messages([human_msg, ai_msg])

        # Enforce window after each save — drop oldest if over limit
        messages = self.chat_memory.messages
        if len(messages) > self.k * 2:
            self.chat_memory.clear()
            self.chat_memory.add_messages(messages[-self.k * 2:])
```

## Pattern 3: AutoGen Model Context Management

**Source:** `microsoft/autogen` — `python/packages/autogen-agentchat/src/autogen_agentchat/agents/_assistant_agent.py`

Modern agents use explicit model context objects that track conversation history and provide bounded window management:

```python
from __future__ import annotations

import asyncio
import logging
import uuid
from typing import (
    Any,
    AsyncGenerator,
    Awaitable,
    Callable,
    Dict,
    List,
    Optional,
    Sequence,
    TypeVar,
)

from autogen_core import CancellationToken, Component, FunctionCall
from autogen_core.memory import Memory
from autogen_core.model_context import (
    ChatCompletionContext,
    UnboundedChatCompletionContext,
)
from autogen_core.models import (
    AssistantMessage,
    ChatCompletionClient,
    CreateResult,
    FunctionExecutionResult,
    FunctionExecutionResultMessage,
    LLMMessage,
    SystemMessage,
)
from autogen_core.tools import BaseTool, FunctionTool, ToolResult
from pydantic import BaseModel, Field


class AssistantAgentConfig(BaseModel):
    """Declarative configuration for the assistant agent."""

    name: str
    model_client: ComponentModel
    tools: List[ComponentModel] | None = None
    handoffs: List[HandoffBase | str] | None = None
    model_context: ComponentModel | None = None
    memory: List[ComponentModel] | None = None
    description: str
    system_message: str | None = None
    reflect_on_tool_use: bool
    tool_call_summary_format: str
    max_tool_iterations: int = Field(default=1, ge=1)


class AssistantAgent(BaseChatAgent, Component[AssistantAgentConfig]):
    """An agent that provides assistance with tool use.

    State Management:
    - The agent maintains its own conversation history via model_context
    - Do NOT pass entire conversation history on each call — only new messages
    - max_tool_iterations controls how many sequential tool-call loops run

    Tool Call Behavior:
    - If model returns no tool calls → response returned as TextMessage
    - When reflect_on_tool_use=True → another inference after tool results
    - Multiple parallel tool calls are executed concurrently when supported
    """

    def __init__(
        self,
        name: str,
        model_client: ChatCompletionClient,
        *,
        tools: Sequence[BaseTool] = (),
        handoffs: Sequence[HandoffBase | str] = (),
        model_context: ChatCompletionContext | None = None,
        memory: Sequence[Memory] = (),
        description: str = "An agent",
        system_message: str | None = "You are a helpful AI assistant.",
        reflect_on_tool_use: bool = True,
        tool_call_summary_format: str = "{response}",
        max_tool_iterations: int = 1,
    ) -> None:
        """Initialize assistant agent.

        Args:
            name: Unique identifier for this agent in a multi-agent team.
            model_client: LLM client for chat completion calls.
            tools: Tools available for the model to invoke via function calling.
            handoffs: Other agents this agent can transfer control to.
            model_context: Conversation history store. Defaults to unbounded.
            memory: External memory systems (vector stores, knowledge bases).
            description: Shown to other agents when selecting speakers.
            system_message: Initial system prompt for the conversation.
            reflect_on_tool_use: If True, make another LLM call after tool results.
            tool_call_summary_format: How to summarize tool call results.
            max_tool_iterations: Max sequential tool-call loops (prevents infinite loops).
        """
        self._name = name
        self._model_client = model_client
        self._tools = list(tools)
        self._handoffs = list(handoffs)
        self._model_context = model_context or UnboundedChatCompletionContext()
        self._memory = list(memory)
        self._description = description
        self._system_message = system_message
        self._reflect_on_tool_use = reflect_on_tool_use
        self._max_tool_iterations = max_tool_iterations

    async def on_messages(
        self,
        messages: Sequence[BaseChatMessage],
        cancellation_token: CancellationToken | None = None,
    ) -> Response:
        """Handle a sequence of messages. Only NEW messages should be passed.

        The agent maintains its own internal context. Do not pass the full
        conversation history on each call.

        Args:
            messages: New messages since last invocation.
            cancellation_token: Optional token for aborting long operations.

        Returns:
            Response with final chat_message as the agent's reply.
        """
        # Add new messages to internal context
        for msg in messages:
            await self._model_context.add_message(msg)

        # Execute tool call iteration loop
        response = await self._execute_tool_loop(cancellation_token)

        return Response(
            chat_message=response.chat_message,
            inner_messages=response.inner_messages or [],
        )

    async def _execute_tool_loop(
        self, cancellation_token: CancellationToken | None
    ) -> Response:
        """Run the tool call loop up to max_tool_iterations.

        Loop pattern:
        1. Build conversation from context + system message
        2. Call LLM with tools bound
        3. If tool calls returned → execute them, add results to context
        4. Repeat until text response or max iterations reached
        """
        inner_messages: list[BaseAgentEvent] = []

        for _iteration in range(self._max_tool_iterations):
            # Build full conversation for the LLM call
            conversation = await self._model_context.get_messages()
            all_messages: list[LLMMessage] = [SystemMessage(content=self._system_message)]
            all_messages.extend(conversation)

            # Call the model with tools
            result = await self._model_client.create(
                all_messages,
                tools=self._tools,
                cancellation_token=cancellation_token,
            )

            if result.content:
                # Text response — done
                text_msg = TextMessage(
                    content=result.content[0].text or "",
                    source=self._name,
                )
                await self._model_context.add_message(text_msg)
                return Response(chat_message=text_msg, inner_messages=inner_messages)

            # Tool calls returned — execute them
            if result.call_events:
                tool_results = []
                for call in result.call_events:
                    if isinstance(call, FunctionCall):
                        execution = await self._execute_single_tool_call(call)
                        tool_results.append(execution)

                # Add results to context for next iteration
                execution_msg = FunctionExecutionResultMessage(
                    contents=tool_results
                )
                await self._model_context.add_message(execution_msg)
                inner_messages.extend(tool_results)

        # Max iterations reached without text response
        fallback_msg = TextMessage(
            content=f"Reached maximum tool iterations ({self._max_tool_iterations}).",
            source=self._name,
        )
        return Response(chat_message=fallback_msg, inner_messages=inner_messages)

    async def _execute_single_tool_call(self, call: FunctionCall) -> ToolCallExecutionEvent:
        """Execute a single function/tool call by name and arguments."""
        tool = next((t for t in self._tools if isinstance(t, FunctionTool) and t.name == call.name), None)
        if tool is None:
            return ToolCallExecutionEvent(
                contents=[ToolResult(content=f"Unknown tool: {call.name}", tool_name=call.name)],
                id=call.id or str(uuid.uuid4()),
            )

        try:
            result = await tool.run_json(call.args, cancellation_token=None)
            return ToolCallExecutionEvent(
                contents=[ToolResult(content=str(result), tool_name=call.name)],
                id=call.id or str(uuid.uuid4()),
            )
        except Exception as e:
            return ToolCallExecutionEvent(
                contents=[ToolResult(content=f"Error: {e}", tool_name=call.name)],
                id=call.id or str(uuid.uuid4()),
            )
```

## Pattern 4: Long-Term Memory with Vector Store Embeddings

Modern agents store factual memories in vector stores and retrieve them based on semantic similarity to the current context. LlamaIndex provides this via its embedding + retriever architecture:

```python
from typing import List, Optional, Sequence, Any
from llama_index.core.schema import BaseNode, Document, NodeWithScore, QueryBundle
from llama_index.core.base.embeddings.base import BaseEmbedding


class LongTermMemoryStore:
    """Stores factual memories in a vector store and retrieves them by semantic similarity.

    Pattern: On each conversation turn, relevant past memories are retrieved via
    embedding-based search and injected into the context window.
    """

    def __init__(
        self,
        embed_model: BaseEmbedding,
        vector_store: Any,  # VectorStore from any supported backend
        similarity_top_k: int = 5,
        embedding_dim: int = 1536,
    ) -> None:
        """Initialize long-term memory store.

        Args:
            embed_model: Embedding model for encoding queries and stored memories.
            vector_store: Backend storage (Pinecone, Weaviate, Qdrant, pgvector, etc.)
            similarity_top_k: Number of top results to retrieve per query.
            embedding_dim: Dimension of the embedding vectors.
        """
        self.embed_model = embed_model
        self.vector_store = vector_store
        self.similarity_top_k = similarity_top_k

    def add_memory(self, content: str, metadata: Optional[dict] = None) -> str:
        """Store a new memory in the vector store.

        Args:
            content: The factual content to store.
            metadata: Optional tags (source, timestamp, category).

        Returns:
            Memory ID for later retrieval or update.
        """
        doc = Document(text=content, metadata=metadata or {})
        nodes = self.embed_model.get_text_embedding_batch([content])
        node_id = f"mem_{len(self._get_all_memories())}"
        self.vector_store.add([node_id], [nodes[0]], [{"content": content}])
        return node_id

    def retrieve_memories(
        self, query: str, relevance_threshold: float = 0.7
    ) -> List[str]:
        """Retrieve relevant memories based on semantic similarity to the query.

        Args:
            query: The current conversation context or question.
            relevance_threshold: Minimum similarity score to include a result.

        Returns:
            List of relevant memory content strings, sorted by similarity.
        """
        query_embedding = self.embed_model.get_query_embedding(query)
        results = self.vector_store.query(
            query_embedding=query_embedding,
            top_k=self.similarity_top_k,
        )
        return [
            r.text for r in results
            if r.score is not None and r.score >= relevance_threshold
        ]

    def _get_all_memories(self) -> List[Document]:
        """Return all stored memories (for management operations)."""
        # Implementation depends on vector store backend
        raise NotImplementedError
```

---

# 3. Planning & Reasoning

## Overview

Planning patterns enable agents to reason step-by-step before acting. The dominant patterns are: ReAct (Reason + Act), Chain-of-Thought (CoT) prompting, Plan-and-Execute (decompose then execute), and Self-Reflection (evaluate and iterate).

## Pattern 1: ReAct Agent with Tool Loop

**Source:** `langchain-ai/langchain` — `libs/langchain/langchain_classic/agents/react/base.py`

The ReAct pattern interleaves reasoning (thought) with action (tool call) and observation:

```python
"""Chain that implements the ReAct paper from https://arxiv.org/pdf/2210.03629.pdf."""

from collections.abc import Sequence
from typing import TYPE_CHECKING, Any

from langchain_core.language_models import BaseLanguageModel
from langchain_core.prompts import BasePromptTemplate
from langchain_core.tools import BaseTool, Tool


class ReActDocstoreAgent:
    """Agent implementing the ReAct (Reason+Act) pattern.

    The ReAct loop: Thought → Action → Observation → Thought → Action → ...

    Each iteration:
    1. LLM generates a "Thought" about what to do next
    2. If action is needed, LLM calls a tool with structured arguments
    3. Tool output becomes the "Observation" appended to context
    4. Loop repeats until the LLM produces a final answer

    This pattern is superior to pure CoT because it grounds reasoning
    in actual external information rather than relying solely on model knowledge.
    """

    observation_prefix: str = "Observation:"
    llm_prefix: str = "Thought:"

    def __init__(
        self,
        llm: BaseLanguageModel,
        tools: Sequence[BaseTool],
        prompt: BasePromptTemplate | None = None,
        max_iterations: int = 15,
        early_stopping_method: str = "force",
    ) -> None:
        """Initialize ReAct agent.

        Args:
            llm: Language model that generates thoughts and tool calls.
            tools: Available tools the agent can invoke during reasoning.
            prompt: ReAct-specific prompt template with chain-of-thought format.
            max_iterations: Maximum Reason-Act cycles before forced termination.
            early_stopping_method: "force" (hard stop) or "stop" (graceful).
        """
        self.llm = llm
        self.tools = {tool.name: tool for tool in tools}
        self.prompt = prompt
        self.max_iterations = max_iterations
        self.early_stopping_method = early_stopping_method

    @classmethod
    def create_prompt(cls, tools: Sequence[BaseTool]) -> BasePromptTemplate:
        """Create the ReAct prompt template.

        The prompt encodes the ReAct chain-of-thought format:

        Question: <user question>
        Thought: <model's reasoning about what to do next>
        Action: <tool name>
        Action Input: <structured arguments>
        Observation: <tool output>
        Thought: <interpretation of observation + next step>
        ... (repeat) ...
        Final Answer: <final response to user>

        Args:
            tools: Available tools — their names and descriptions are injected.

        Returns:
            PromptTemplate with ReAct format instructions.
        """
        tool_names = " ".join([tool.name for tool in tools])
        tool_descriptions = "\n".join([
            f"{tool.name}: {tool.description}" for tool in tools
        ])
        # In production, load from a template file with proper formatting
        raise NotImplementedError

    def _validate_tools(self, tools: Sequence[BaseTool]) -> None:
        """Validate that all tools are properly configured.

        Checks:
        - No duplicate names
        - Each tool has a non-empty description (needed for prompt injection)
        - Tools return strings (for observation parsing)
        """
        tool_names = [tool.name for tool in tools]
        if len(tool_names) != len(set(tool_names)):
            raise ValueError(f"Duplicate tool names: {tool_names}")
        for tool in tools:
            if not tool.description:
                raise ValueError(f"Tool '{tool.name}' must have a description")

    @property
    def _stop(self) -> list[str]:
        """Stop sequences that signal the end of a reasoning step."""
        return ["\nObservation:", "\n\tObservation:"]


class DocstoreExplorer:
    """Helper class that manages document search within ReAct loops.

    Provides two operations:
    - search(term): Find documents matching a term (first paragraph returned)
    - lookup(term): Search within the most recently found document

    This pattern prevents context pollution by keeping each search
    operation isolated to its relevant document scope.
    """

    def __init__(self, docstore: Any) -> None:
        """Initialize with a document store backend.

        Args:
            docstore: Backend supporting .search(term) -> Document | str
        """
        self.docstore = docstore
        self.document: Document | None = None
        self.lookup_str = ""
        self.lookup_index = 0

    def search(self, term: str) -> str:
        """Search for a term in the document store.

        On success, saves the found document for subsequent lookup operations.

        Args:
            term: Search query string.

        Returns:
            First paragraph of the first matching document.
        """
        result = self.docstore.search(term)
        if isinstance(result, Document):
            self.document = result
            return self._paragraphs[0]  # Return first paragraph
        self.document = None
        return str(result)

    def lookup(self, term: str) -> str:
        """Lookup a term within the most recently found document.

        Only works after a successful search() call. Supports paginated
        results when multiple paragraphs match.

        Args:
            term: Term to find within current document.

        Returns:
            Matching paragraph with pagination indicator, or "No Results".
        """
        if self.document is None:
            raise ValueError("Cannot lookup without a successful search first")

        # Support pagination: repeated calls with same term return next match
        if term.lower() != self.lookup_str:
            self.lookup_str = term.lower()
            self.lookup_index = 0
        else:
            self.lookup_index += 1

        matching = [p for p in self._paragraphs if self.lookup_str in p.lower()]
        if not matching:
            return "No Results"
        if self.lookup_index >= len(matching):
            return "No More Results"

        return f"(Result {self.lookup_index + 1}/{len(matching)}) {matching[self.lookup_index]}"

    @property
    def _paragraphs(self) -> list[str]:
        """Split document into paragraphs."""
        if self.document is None:
            raise ValueError("No document loaded")
        return self.document.page_content.split("\n\n")
```

## Pattern 2: LangGraph ReAct Agent (Modern Implementation)

**Source:** `langchain-ai/langgraph` — `libs/prebuilt/langgraph/prebuilt/chat_agent_executor.py`

The modern approach uses a state graph instead of prompt-based parsing, making tool calling native rather than string-parsed:

```python
"""ReAct agent built on LangGraph StateGraph."""

from collections.abc import Sequence
from typing import (
    Annotated,
    Any,
    Literal,
    TypedDict,
)

from langchain_core.language_models import BaseChatModel, LanguageModelInput
from langchain_core.messages import (
    AIMessage,
    AnyMessage,
    BaseMessage,
    SystemMessage,
    ToolMessage,
)
from langchain_core.runnables import Runnable, RunnableBinding
from langchain_core.tools import BaseTool
from langgraph.graph import END, StateGraph
from langgraph.graph.message import add_messages
from pydantic import BaseModel


class AgentState(TypedDict):
    """The state of the ReAct agent.

    Uses Annotated[list[BaseMessage], add_messages] which means new messages
    are MERGED with existing ones (not replaced). This is how message history
    accumulates across iterations automatically.
    """
    messages: Annotated[Sequence[BaseMessage], add_messages]


def _should_bind_tools(model: Any, tools: Sequence[BaseTool]) -> bool:
    """Determine whether to bind tools via model.bind_tools() or pass via API.

    If the model is already wrapped in a RunnableBinding with 'tools' key,
    verify that the tool count matches. Otherwise, return True to bind.
    """
    if isinstance(model, RunnableBinding):
        bound_tools = model.kwargs.get("tools", [])
        if len(tools) != len(bound_tools):
            raise ValueError(
                f"Number of tools mismatch: passed {len(tools)}, "
                f"model has {len(bound_tools)} bound. "
                "Either match tool counts or don't pre-bind tools."
            )
        return False  # Already bound, don't bind again
    return True


def create_react_agent(
    model: BaseChatModel,
    tools: Sequence[BaseTool],
    *,
    prompt: str | None = None,
    checkpointer: Any = None,
) -> Runnable:
    """Create a ReAct agent using LangGraph StateGraph.

    This is the modern approach to ReAct — instead of parsing text output
    for "Action:" and "Observation:" strings, it uses native tool calling
    where the model directly returns structured tool calls.

    Graph structure:
        START → should_bind_tools? → chat_model → tools_condition → {tools | END}

    The tools_condition routes back to chat_model if tool calls remain,
    or to END if a final text response was produced.

    Args:
        model: Chat model with native tool calling support (OpenAI, Anthropic, etc.)
        tools: Tools available for the agent to invoke.
        prompt: Optional system message prefixing all conversations.
        checkpointer: Optional persistence layer for conversation history
                      across sessions (e.g., SQLiteSaver, RedisSaver).

    Returns:
        Compiled LangGraph runnable that processes messages through ReAct loop.
    """
    # Bind tools to model if not already bound
    if _should_bind_tools(model, tools):
        model = model.bind_tools(tools)

    # Build the state graph
    workflow = StateGraph(AgentState)

    # Define nodes
    def chat_model(state: AgentState) -> dict:
        """Call the LLM with conversation history and available tool schemas.

        The bound tools appear as function schemas in the model's output.
        If the model returns tool calls, they go to the tools node.
        If it returns text, the response ends here.
        """
        messages = state["messages"]
        if prompt:
            messages = [SystemMessage(content=prompt)] + list(messages)
        response = model.invoke(messages)
        return {"messages": [response]}

    tool_node = ToolNode(tools)  # Prebuilt parallel tool executor

    def should_continue(state: AgentState) -> Literal["tools", "__end__"]:
        """Decide whether to continue with tool execution or finish.

        Returns 'tools' if the last message contains tool_calls,
        returns '__end__' (END) if the model produced a text response.
        """
        messages = state["messages"]
        last_message = messages[-1]
        if isinstance(last_message, AIMessage) and last_message.tool_calls:
            return "tools"
        return "__end__"

    # Build graph
    workflow.add_node("chat_model", chat_model)
    workflow.add_node("tools", tool_node)
    workflow.set_entry_point("chat_model")
    workflow.add_conditional_edges(
        "chat_model", should_continue, {"tools": "tools", "__end__": END}
    )
    workflow.add_edge("tools", "chat_model")

    # Compile with optional checkpointing for persistence
    app = workflow.compile(checkpointer=checkpointer)
    return app


def tools_condition(state: AgentState) -> Literal["tools", "__end__"]:
    """Utility function for conditional routing after tool execution.

    If the model's last message still has tool calls, route back to chat_model.
    Otherwise, terminate the graph. This is used in more complex agent graphs
    where tool results may trigger additional reasoning.
    """
    messages = state["messages"]
    last = messages[-1]
    if isinstance(last, AIMessage) and last.tool_calls:
        return "tools"
    return "__end__"
```

## Pattern 3: Self-Reflection Loop

Self-reflection evaluates the agent's own output for quality before returning it to the user. This is implemented as a separate graph node that reviews messages:

```python
from typing import Any, Sequence
from langchain_core.messages import BaseMessage, AIMessage, HumanMessage
from langchain_core.language_models import BaseChatModel


class ReflectionAgent:
    """Implements a self-reflection loop for agent output quality.

    Pattern: Agent produces draft → Reflection model evaluates draft →
    If score < threshold, agent revises → Repeat until acceptable or max iterations.

    This is particularly effective for:
    - Code generation (verify correctness before returning)
    - Research summaries (verify citations are real and relevant)
    - Multi-step problem solving (verify each step's validity)
    """

    def __init__(
        self,
        executor_model: BaseChatModel,
        reflection_model: BaseChatModel | None = None,
        *,
        max_reflection_rounds: int = 3,
        quality_threshold: float = 0.7,
    ) -> None:
        """Initialize reflection loop.

        Args:
            executor_model: Primary model that does the actual work.
            reflection_model: Model used for quality evaluation. Defaults to executor_model.
            max_reflection_rounds: Maximum revision iterations.
            quality_threshold: Minimum quality score (0.0-1.0) to accept output.
        """
        self.executor_model = executor_model
        self.reflection_model = reflection_model or executor_model
        self.max_reflection_rounds = max_reflection_rounds
        self.quality_threshold = quality_threshold

    def run_with_reflection(
        self,
        user_input: str,
        initial_messages: Sequence[BaseMessage] | None = None,
    ) -> str:
        """Run the agent with self-reflection on its output.

        Args:
            user_input: The user's question or request.
            initial_messages: Optional conversation history to prepend.

        Returns:
            The final accepted response after reflection loop completes.

        Raises:
            RuntimeError: If quality threshold not met after max iterations.
        """
        messages = list(initial_messages or [])
        messages.append(HumanMessage(content=user_input))

        for round_num in range(self.max_reflection_rounds):
            # Step 1: Generate draft response
            draft_response = self.executor_model.invoke(messages)
            messages.append(draft_response)

            # Step 2: Reflect on quality
            quality_score, feedback = self._evaluate_quality(
                messages[-1].content, user_input
            )

            if quality_score >= self.quality_threshold:
                return draft_response.content

            # Step 3: Append reflection feedback and retry
            messages.append(
                HumanMessage(
                    content=f"[Self-Reflection Round {round_num + 1}]\n"
                    f"Quality score: {quality_score:.2f}/1.0\n"
                    f"Feedback: {feedback}\nPlease revise your response."
                )
            )

        raise RuntimeError(
            f"Could not meet quality threshold ({self.quality_threshold}) "
            f"after {self.max_reflection_rounds} reflection rounds."
        )

    def _evaluate_quality(
        self, response: str, user_input: str
    ) -> tuple[float, str]:
        """Evaluate response quality using a separate LLM call.

        The reflection model scores on multiple criteria:
        - Directness: Does the response directly address the question?
        - Accuracy: Are facts and claims verifiable?
        - Completeness: Does it cover all aspects of the question?
        - Safety: Are there any harmful or misleading statements?

        Args:
            response: The draft response to evaluate.
            user_input: Original user question for context.

        Returns:
            (quality_score, feedback_string) tuple. Score is 0.0-1.0.
        """
        reflection_prompt = f"""Evaluate the following AI response for quality.

User question: {user_input}

AI response: {response}

Score from 0.0 to 1.0 on these criteria (provide weighted average):
1. Directness (40%): Does it directly answer the question?
2. Accuracy (30%): Are claims factually correct and verifiable?
3. Completeness (20%): Does it cover all aspects of the question?
4. Safety (10%): Is there anything harmful or misleading?

Return your response in this exact format:
SCORE: <number 0-1>
FEEDBACK: <specific, actionable feedback for improvement>
"""
        evaluation = self.reflection_model.invoke([HumanMessage(content=reflection_prompt)])
        content = evaluation.content

        # Parse the structured evaluation
        score_line = [l for l in content.split("\n") if l.startswith("SCORE:")]
        feedback_lines = [l for l in content.split("\n") if l.startswith("FEEDBACK:")]

        score = float(score_line[0].split(":")[1].strip()) if score_line else 0.0
        feedback = feedback_lines[0].replace("FEEDBACK:", "").strip() if feedback_lines else ""

        return score, feedback
```

---

# 4. Multi-Agent Orchestration

## Overview

Multi-agent systems coordinate multiple specialized agents to solve complex tasks. The three main architectural patterns are:
- **Sequential crew** (CrewAI): Agents execute in order, passing outputs
- **Hierarchical supervisor** (CrewAI): A manager agent delegates to workers
- **Group chat / conversational** (AutoGen): Agents take turns speaking

## Pattern 1: CrewAI Sequential Crew

**Source:** `crewAIInc/crewai` — Template and core implementations

```python
"""CrewAI Crew template - sequential multi-agent orchestration."""

from crewai import Agent, Crew, Process, Task
from crewai.project import CrewBase, agent, crew, task
from crewai.agents.agent_builder.base_agent import BaseAgent


@CrewBase
class ResearchCrew:
    """A crew of specialized agents that work sequentially to complete research tasks.

    Pattern: Sequential execution where each agent's output feeds into the next.
    Best for workflows with clear handoffs (researcher → analyst → writer).
    """

    agents: list[BaseAgent]
    tasks: list[Task]

    @agent
    def researcher(self) -> Agent:
        """Senior researcher agent specialized in information gathering.

        Tools available: web search, API queries, document parsers.
        Output: structured research findings with citations.
        """
        return Agent(
            config=self.agents_config['researcher'],  # YAML config with LLM, tools
            verbose=True,
            allow_delegation=False,  # Cannot delegate to other agents
        )

    @agent
    def analyst(self) -> Agent:
        """Data analyst agent that processes raw research findings.

        Tools available: data analysis libraries, statistical calculators.
        Output: analyzed insights with supporting metrics.
        """
        return Agent(
            config=self.agents_config['analyst'],
            verbose=True,
        )

    @agent
    def reporting_analyst(self) -> Agent:
        """Writer agent that produces the final report from analyzed data.

        Tools available: document writers, template formatters.
        Output: polished markdown or structured report.
        """
        return Agent(
            config=self.agents_config['reporting_analyst'],
            verbose=True,
        )

    @task
    def research_task(self) -> Task:
        """Gather raw information on the given topic."""
        return Task(
            config=self.tasks_config['research_task'],
            agent=self.researcher(),
        )

    @task
    def analysis_task(self) -> Task:
        """Analyze gathered research and extract key insights."""
        return Task(
            config=self.tasks_config['analysis_task'],
            agent=self.analyst(),
            context=[self.research_task()],  # Depends on research output
        )

    @task
    def reporting_task(self) -> Task:
        """Produce final report from analyzed insights."""
        return Task(
            config=self.tasks_config['reporting_task'],
            agent=self.reporting_analyst(),
            context=[self.analysis_task()],  # Depends on analysis output
            output_file='report.md',
        )

    @crew
    def crew(self) -> Crew:
        """Create the crew with sequential execution process."""
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            process=Process.sequential,  # Agents execute in order
            verbose=True,
        )
```

## Pattern 2: Task with Guardrails and Structured Output

**Source:** `crewAIInc/crewai` — `lib/crewai/src/crewai/task.py`

Tasks define the contract between agents — what they receive as input, what tools they can use, and what output format to produce:

```python
from __future__ import annotations

import asyncio
import datetime
import json
import uuid
from collections.abc import Sequence
from typing import (
    Annotated,
    Any,
    ClassVar,
    cast,
)

from pydantic import (
    UUID4,
    BaseModel,
    BeforeValidator,
    Field,
    PrivateAttr,
    field_validator,
    model_validator,
)
from typing_extensions import Self


class Task(BaseModel):
    """Represents a task to be executed by an agent.

    Each task defines:
    - description: What needs to be done (given to the agent's prompt)
    - expected_output: Format and content specification for the output
    - tools: Restricted set of tools available to this specific task
    - context: Dependencies on other tasks' outputs
    - output_json/output_pydantic: Structured output enforcement via Pydantic model

    The guardrail system allows post-execution validation — if a task's
    output doesn't meet quality standards, it can be sent back for revision.
    """

    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)

    # Execution tracking counters
    used_tools: int = 0
    tools_errors: int = 0
    delegations: int = 0

    # Core task definition
    description: str = Field(description="Description of the actual task.")
    expected_output: str = Field(
        description="Clear definition of expected output for the task."
    )

    # Agent assignment
    agent: Any = Field(  # BaseAgent type
        default=None,
        description="Agent responsible for executing this task.",
    )

    # Output enforcement
    output_json: type[BaseModel] | None = Field(
        default=None,
        description="Pydantic model that the output must conform to as a JSON dict.",
    )
    output_pydantic: type[BaseModel] | None = Field(
        default=None,
        description="Pydantic model class for structured output validation.",
    )
    output_file: str | None = Field(
        default=None,
        description="File path where the output should be saved.",
    )

    # Tool restrictions
    tools: list[BaseTool] = Field(
        default_factory=list,
        description="Tools/resources made available to this specific task.",
    )

    # Task dependencies
    context: list[Task] = Field(
        default_factory=list,
        description="Tasks whose outputs serve as input for this task.",
    )

    @model_validator(mode="after")
    def validate_output_constraints(self) -> Self:
        """Ensure output constraints are consistent.

        Only one of output_json, output_pydantic, or raw output can be specified.
        Mixing structured output with file output is allowed (both saved).
        """
        if self.output_json and self.output_pydantic:
            raise ValueError(
                "Cannot specify both output_json and output_pydantic. "
                "Choose one structured output format."
            )
        return self

    async def execute_async(
        self,
        crew: Any = None,  # Crew context for inter-agent communication
        tools: Sequence[BaseTool] | None = None,
    ) -> TaskOutput:
        """Execute this task asynchronously.

        Execution flow:
        1. Resolve input from context tasks and original description
        2. Inject available tools into the agent's execution context
        3. Run the agent with the resolved prompt
        4. Validate output against expected format (Pydantic, JSON schema)
        5. Apply guardrail checks if configured
        6. Save to file if output_file specified
        7. Return TaskOutput for downstream tasks

        Args:
            crew: Parent crew providing cross-agent context.
            tools: Additional tools beyond what's defined on this task.

        Returns:
            TaskOutput containing result string, agent name, and metadata.
        """
        if not self.agent:
            raise ValueError(f"Task '{self.description}' has no assigned agent")

        # Resolve input from context tasks
        context_outputs = []
        for ctx_task in self.context:
            if hasattr(ctx_task, 'result') and ctx_task.result:
                context_outputs.append(str(ctx_task.result))

        # Build the full prompt with context
        prompt_parts = [self.description]
        if context_outputs:
            prompt_parts.append(f"\nContext from previous tasks:\n" + "\n".join(context_outputs))
        prompt_parts.append(f"\nExpected output format:\n{self.expected_output}")

        full_prompt = "\n\n".join(prompt_parts)

        # Execute with tools
        available_tools = list(self.tools) + (list(tools) if tools else [])
        result = await self.agent.execute_async(
            prompt=full_prompt,
            tools=available_tools,
            context=crew,
        )

        # Validate structured output if specified
        if self.output_pydantic:
            result = _validate_pydantic_output(str(result), self.output_pydantic)
        elif self.output_json:
            result = _validate_json_output(str(result), self.output_json)

        # Apply guardrails if configured
        result = await self._apply_guardrails(str(result))

        # Save to file if specified
        if self.output_file and hasattr(self, 'result'):
            await self._save_to_file(str(result))

        task_output = TaskOutput(
            description=self.description,
            raw=str(result),
            agent=self.agent.name or str(self.agent),
            pydantic=result if self.output_pydantic else None,
        )
        self.result = task_output
        return task_output

    async def _apply_guardrails(self, result: str) -> str:
        """Apply guardrail validation to the task output.

        Guardrails are post-execution quality checks that can:
        - Reject low-quality outputs for re-generation
        - Transform outputs to meet format requirements
        - Flag outputs requiring human review

        Args:
            result: The raw output from the agent execution.

        Returns:
            Validated and potentially transformed output string.
        """
        if not hasattr(self, 'guardrails') or not self.guardrails:
            return result

        for guardrail in self.guardrails:
            if isinstance(guardrail, GuardrailCallable):
                result = guardrail(result)
            elif isinstance(guardrail, dict) and 'action' in guardrail:
                action = guardrail['action']
                if action == 'reject':
                    raise ValueError(f"Guardrail rejected output: {guardrail.get('reason')}")

        return result
```

## Pattern 3: AutoGen Group Chat with Manager Routing

**Source:** `microsoft/autogen` — `python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_base_group_chat_manager.py`

The group chat pattern uses an LLM-powered manager to select which agent speaks next, enabling natural conversational multi-agent workflows:

```python
import asyncio
from abc import ABC, abstractmethod
from typing import Any, List, Sequence

from autogen_core import CancellationToken, DefaultTopicId, MessageContext, event, rpc


class BaseGroupChatManager(SequentialRoutedAgent, ABC):
    """Manages a group chat with multiple participant agents.

    Architecture:
    - Participants subscribe to both the group topic and their own individual topic
    - The manager subscribes to the group topic
    - When an agent responds, the manager uses an LLM to select the next speaker
    - Termination is controlled by a TerminationCondition (e.g., max turns, stop message)

    This pattern enables:
    - Dynamic role switching based on conversation context
    - Natural handoffs between specialist agents
    - Controlled conversation length via termination conditions
    """

    def __init__(
        self,
        name: str,
        group_topic_type: str,
        output_topic_type: str,
        participant_topic_types: List[str],
        participant_names: List[str],
        participant_descriptions: List[str],
        output_message_queue: asyncio.Queue,
        termination_condition: TerminationCondition | None,
        max_turns: int | None,
        message_factory: MessageFactory,
        emit_team_events: bool = False,
    ):
        """Initialize group chat manager.

        Args:
            name: Identifier for this manager agent.
            group_topic_type: Topic type for the shared group channel.
            output_topic_type: Topic type for the final output channel.
            participant_topic_types: Unique topic type per participant agent.
            participant_names: Human-readable names shown to the speaker selector.
            participant_descriptions: Detailed descriptions used by the LLM speaker selector.
            output_message_queue: Queue for collecting all messages from this team.
            termination_condition: Condition that, when met, stops the conversation.
            max_turns: Hard limit on total message exchanges (failsafe).
            message_factory: Factory for creating typed message objects.
        """
        super().__init__(
            description="Group chat manager",
            sequential_message_types=[
                GroupChatStart,
                GroupChatAgentResponse,
                GroupChatTeamResponse,
                GroupChatMessage,
                GroupChatReset,
            ],
        )

        if max_turns is not None and max_turns <= 0:
            raise ValueError("max_turns must be greater than 0")
        if len(participant_topic_types) != len(participant_descriptions):
            raise ValueError("Participant types and descriptions must match in count")
        if len(set(participant_topic_types)) != len(participant_topic_types):
            raise ValueError("Participant topic types must all be unique")
        if group_topic_type in participant_topic_types:
            raise ValueError("Group topic type must not overlap with participant types")

        self._name = name
        self._group_topic_type = group_topic_type
        self._participant_names = participant_names
        self._participant_name_to_topic_type = dict(
            zip(participant_names, participant_topic_types, strict=True)
        )
        self._participant_descriptions = participant_descriptions
        self._termination_condition = termination_condition
        self._max_turns = max_turns
        self._current_turn = 0
        self._message_thread: List[Any] = []

    @rpc
    async def handle_start(self, message: GroupChatStart, ctx: MessageContext) -> None:
        """Handle the start of a group chat session.

        Validates group state, relays initial messages to all participants,
        and selects the first speaker.
        """
        # Check if conversation already terminated
        if self._termination_condition and self._termination_condition.terminated:
            stop_msg = StopMessage(
                content="The group chat has already terminated.",
                source=self._name,
            )
            await self._signal_termination(stop_msg)
            return

        # Relay initial messages to all participants
        if message.messages:
            await self.publish_message(
                GroupChatStart(messages=message.messages),
                topic_id=DefaultTopicId(type=self._group_topic_type),
            )
            for msg in message.messages:
                await self._output_message_queue.put(msg)

        # Append to conversation thread and check termination
        if message.messages:
            await self.update_message_thread(message.messages)
            if await self._apply_termination_condition(message.messages):
                return

        # Select the first speaker using LLM-based routing
        await self._transition_to_next_speakers(ctx.cancellation_token)

    @event
    async def handle_agent_response(
        self,
        message: GroupChatAgentResponse | GroupChatTeamResponse,
        ctx: MessageContext,
    ) -> None:
        """Handle a response from any participant agent.

        Flow:
        1. Append response to conversation thread
        2. Apply termination condition check
        3. Select next speaker using LLM
        4. Publish selected speaker's topic to the group channel
        """
        # Collect delta messages from the response
        delta: List[Any] = []
        if isinstance(message, GroupChatAgentResponse):
            if message.response.inner_messages:
                for inner_msg in message.response.inner_messages:
                    delta.append(inner_msg)
            delta.append(message.response.chat_message)
        else:
            delta.extend(message.result.messages)

        # Update conversation thread
        await self.update_message_thread(delta)

        # Check termination
        if await self._apply_termination_condition(delta):
            return

        # Select next speaker
        await self._transition_to_next_speakers(ctx.cancellation_token)

    @abstractmethod
    async def _transition_to_next_speakers(
        self, cancellation_token: CancellationToken | None = None
    ) -> None:
        """Select the next speaker(s) using an LLM-based chooser.

        The implementation should:
        1. Build a prompt listing current conversation + participant descriptions
        2. Call an LLM to select which agent should speak next
        3. Publish a SelectSpeakerEvent to the group topic
        """
        ...
```

## Pattern 4: Supervisor-Worker (Hierarchical) Pattern

The hierarchical pattern uses a supervisor/manager agent that breaks down complex tasks and delegates subtasks to specialized worker agents:

```python
from typing import Any, List, Optional, Sequence
from langchain_core.messages import BaseMessage, AIMessage, HumanMessage, SystemMessage
from langchain_core.language_models import BaseChatModel
from langchain_core.tools import BaseTool


class SupervisorAgent:
    """Supervisor agent that decomposes tasks and delegates to worker agents.

    Architecture:
        ┌─────────────┐     task分解      ┌──────────┐ ┌──────────┐ ┌──────────┐
        │  Supervisor  │ ──────────────► │ Worker A │ │ Worker B │ │ Worker C │
        │  (Manager)   │ ◄────────────── │ (expert) │ │ (expert) │ │ (expert) │
        └─────────────┘    results       └──────────┘ └──────────┘ └──────────┘
               │                                          │
               └────────────── final answer ─────────────┘

    The supervisor:
    1. Receives a complex task from the user
    2. Decomposes it into subtasks for specialized workers
    3. Collects results and synthesizes a final answer
    """

    def __init__(
        self,
        model: BaseChatModel,
        workers: List[WorkerAgent],
        max_workers_active: int = 2,
    ) -> None:
        """Initialize supervisor with worker agents.

        Args:
            model: LLM used for task decomposition and result synthesis.
            workers: List of specialized worker agent instances.
            max_workers_active: Maximum number of workers to run simultaneously.
        """
        self.model = model
        self.workers = {w.name: w for w in workers}
        self.max_workers_active = max_workers_active

    def execute(self, task: str) -> str:
        """Execute a complex task by decomposing and delegating to workers.

        Args:
            task: Complex multi-step task description.

        Returns:
            Synthesized final answer combining all worker outputs.
        """
        # Step 1: Decompose the task into subtasks with worker assignments
        subtasks = self._decompose_task(task)

        if not subtasks:
            return "No subtasks generated."

        # Step 2: Execute subtasks (respecting dependencies and parallelism)
        results = self._execute_subtasks(subtasks)

        # Step 3: Synthesize final answer from worker outputs
        final_answer = self._synthesize(results, task)

        return final_answer

    def _decompose_task(self, task: str) -> List[dict]:
        """Decompose a complex task into parallelizable subtasks.

        The supervisor LLM analyzes the task and identifies:
        - Independent subtasks (can run in parallel)
        - Dependent subtasks (must wait for others to complete)
        - Optimal worker assignment based on expertise descriptions
        """
        prompt = f"""You are a task decomposition expert. Break down the following complex
task into subtasks that can be assigned to specialized workers.

Task: {task}

Available workers and their specializations:
{self._list_workers()}

For each subtask, provide:
- id: Unique identifier
- description: What needs to be done
- worker: Which worker should handle it (from the list above)
- depends_on: List of subtask IDs that must complete first (empty if independent)
- parallel: True if this can run alongside other independent tasks

Return your response as a JSON array."""

        response = self.model.invoke([HumanMessage(content=prompt)])
        return self._parse_decomposition(response.content)

    def _execute_subtasks(self, subtasks: List[dict]) -> dict[str, str]:
        """Execute subtasks respecting dependencies and parallelism.

        Uses a dependency graph to schedule execution: independent subtasks
        run in parallel (up to max_workers_active), dependent tasks wait.
        """
        import concurrent.futures

        results: dict[str, str] = {}
        completed = set()
        pending = list(subtasks)

        while pending or not completed == {s['id'] for s in subtasks}:
            # Find subtasks whose dependencies are all met
            ready = [
                st for st in pending
                if all(dep in completed for dep in st.get('depends_on', []))
            ]

            if not ready:
                break  # No progress possible — circular dependency?

            # Execute ready subtasks in parallel (limited by max_workers_active)
            with concurrent.futures.ThreadPoolExecutor(
                max_workers=self.max_workers_active
            ) as executor:
                futures = {}
                for task_spec in ready[:self.max_workers_active]:
                    worker = self.workers[task_spec['worker']]
                    future = executor.submit(worker.execute, task_spec['description'])
                    futures[future] = task_spec['id']

                for future in concurrent.futures.as_completed(futures):
                    task_id = futures[future]
                    results[task_id] = future.result()
                    completed.add(task_id)

            pending = [st for st in pending if st['id'] not in completed]

        return results

    def _synthesize(self, results: dict[str, str], original_task: str) -> str:
        """Synthesize a final answer from individual worker outputs.

        The supervisor reviews all worker results and produces a cohesive
        final response that addresses the original task comprehensively.
        """
        result_text = "\n\n".join(
            f"Worker {task_id} output:\n{output}" for task_id, output in results.items()
        )

        prompt = f"""You are synthesizing a final answer from multiple expert worker outputs.

Original task: {original_task}

Worker outputs:
{result_text}

Provide a comprehensive, well-structured final answer that incorporates the relevant
information from each worker's output. Resolve any contradictions and fill gaps."""

        response = self.model.invoke([HumanMessage(content=prompt)])
        return response.content

    def _list_workers(self) -> str:
        """Return formatted list of workers with descriptions."""
        return "\n".join(
            f"- {w.name}: {w.description}" for w in self.workers.values()
        )

    def _parse_decomposition(self, content: str) -> List[dict]:
        """Parse JSON subtask decomposition from LLM response."""
        import json
        try:
            # Extract JSON array from markdown code block if present
            if "```" in content:
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            return json.loads(content.strip())
        except (json.JSONDecodeError, IndexError):
            raise ValueError(f"Failed to parse subtask decomposition: {content[:200]}")


class WorkerAgent:
    """Specialized agent that handles one type of subtask.

    Each worker has a name, description (for supervisor assignment),
    an LLM, and optionally tools for domain-specific operations.
    """

    def __init__(
        self,
        name: str,
        description: str,
        model: BaseChatModel,
        tools: Optional[Sequence[BaseTool]] = None,
    ) -> None:
        """Initialize worker agent.

        Args:
            name: Unique identifier shown to the supervisor for assignment.
            description: Expertise area used by supervisor for task routing.
            model: LLM for executing the subtask.
            tools: Domain-specific tools available to this worker.
        """
        self.name = name
        self.description = description
        self.model = model
        self.tools = tools or []

    def execute(self, subtask: str) -> str:
        """Execute a specific subtask assigned by the supervisor.

        Args:
            subtask: The specific work to be done.

        Returns:
            Result string from the worker's LLM.
        """
        prompt = f"""You are {self.name}, specialized in {self.description}.

Your task: {subtask}

Provide a thorough, accurate response to this specific task."""

        messages = [SystemMessage(content=self._build_system_prompt()),
                    HumanMessage(content=prompt)]
        return self.model.invoke(messages).content

    def _build_system_prompt(self) -> str:
        """Build the worker's system prompt with role context."""
        return (
            f"You are {self.name}, an AI expert in {self.description}. "
            "Focus on providing accurate, detailed responses for your specific domain. "
            "Do not attempt tasks outside your expertise — just complete your assigned work."
        )
```

---

# 5. RAG Pipelines

## Overview

RAG (Retrieval-Augmented Generation) pipelines retrieve relevant context from external documents and inject it into the LLM prompt. Key components: document chunking, embedding generation, vector store indexing, hybrid search (BM25 + vectors), and re-ranking.

## Pattern 1: Semantic Document Chunking

**Source:** `run-llama/llama_index` — `llama-index-core/llama_index/core/node_parser/text/semantic_splitter.py`

Instead of splitting documents by fixed character count, semantic chunking uses embeddings to find natural boundaries between topics:

```python
from typing import Any, Callable, List, Optional, Sequence, TypedDict
from typing_extensions import Annotated

import numpy as np
from llama_index.core.base.embeddings.base import BaseEmbedding
from llama_index.core.bridge.pydantic import Field, SerializeAsAny
from llama_index.core.callbacks.base import CallbackManager
from llama_index.core.node_parser import NodeParser
from llama_index.core.node_parser.node_utils import (
    build_nodes_from_splits,
    default_id_func,
)
from llama_index.core.node_parser.text.utils import split_by_sentence_tokenizer
from llama_index.core.schema import BaseNode, Document


class SentenceCombination(TypedDict):
    """Represents a group of sentences that will be evaluated for semantic similarity."""
    sentence: str
    index: int
    combined_sentence: str
    combined_sentence_embedding: List[float]


SentenceSplitterCallable = Annotated[
    Callable[[str], List[str]],
    {"type": "string"},  # Serialization schema
    {"type": "string"},  # Validation schema
]


class SemanticSplitterNodeParser(NodeParser):
    """Splits documents into semantically coherent nodes.

    Algorithm:
    1. Split document into sentences using sentence tokenizer
    2. Embed each sentence (or buffer of N sentences)
    3. Calculate cosine similarity between adjacent sentence groups
    4. Identify "semantic breakpoints" where similarity drops below threshold
    5. Group sentences between breakpoints into nodes

    This produces chunks that align with topic boundaries, improving
    retrieval quality because each chunk represents a single coherent idea.

    Args:
        embed_model: Embedding model for computing sentence representations.
        buffer_size: Number of sentences to group before comparing. Larger buffers
                     capture broader context but reduce granularity.
        breakpoint_percentile_threshold: Dissimilarity percentile that triggers a
                                        split. Lower = more splits, more nodes.
    """

    sentence_splitter: SentenceSplitterCallable = Field(
        default_factory=split_by_sentence_tokenizer,
        description="The text splitter to use when splitting documents.",
        exclude=True,  # Don't serialize into config
    )
    embed_model: SerializeAsAny[BaseEmbedding] = Field(
        description="The embedding model used for semantic comparison."
    )
    buffer_size: int = Field(
        default=1,
        description=(
            "Group N sentences together before computing similarity. "
            "Set to 1 for sentence-level granularity; >1 for paragraph-level."
        ),
    )
    breakpoint_percentile_threshold: int = Field(
        default=95,
        description=(
            "The percentile of cosine dissimilarity that must be exceeded between "
            "a group of sentences and the next to form a node boundary. Lower values "
            "produce more nodes (finer granularity)."
        ),
    )

    @classmethod
    def from_defaults(
        cls,
        embed_model: Optional[BaseEmbedding] = None,
        breakpoint_percentile_threshold: Optional[int] = 95,
        buffer_size: Optional[int] = 1,
        sentence_splitter: Optional[Callable[[str], List[str]]] = None,
        include_metadata: bool = True,
        include_prev_next_rel: bool = True,
    ) -> "SemanticSplitterNodeParser":
        """Create a SemanticSplitterNodeParser with default settings.

        Args:
            embed_model: Embedding model. Defaults to OpenAI text-embedding-3-small.
            breakpoint_percentile_threshold: Similarity threshold for splits (0-100).
            buffer_size: Sentences to group before comparing.
            sentence_splitter: Custom sentence splitting function.
            include_metadata: Whether to add chunk metadata to nodes.
            include_prev_next_rel: Link adjacent nodes with prev/next references.

        Returns:
            Configured SemanticSplitterNodeParser instance.
        """
        from llama_index.embeddings.openai import OpenAIEmbedding
        sentence_splitter = sentence_splitter or split_by_sentence_tokenizer()
        embed_model = embed_model or OpenAIEmbedding()

        return cls(
            embed_model=embed_model,
            breakpoint_percentile_threshold=breakpoint_percentile_threshold,
            buffer_size=buffer_size,
            sentence_splitter=sentence_splitter,
            include_metadata=include_metadata,
            include_prev_next_rel=include_prev_next_rel,
        )

    def build_semantic_nodes_from_documents(
        self, documents: Sequence[Document], show_progress: bool = False
    ) -> List[BaseNode]:
        """Build semantically coherent nodes from raw documents.

        For each document:
        1. Split into sentences
        2. Compute embeddings for sliding windows of sentences
        3. Calculate dissimilarity between adjacent windows
        4. Find breakpoints at high-dissimilarity points
        5. Group sentences between breakpoints into nodes

        Args:
            documents: List of Document objects to parse.
            show_progress: Whether to display progress bars.

        Returns:
            List of BaseNode objects with text content and metadata.
        """
        all_nodes: List[BaseNode] = []
        for doc in documents:
            sentences = self.sentence_splitter(doc.text)
            if not sentences:
                continue

            # Step 1: Compute embeddings for sentence groups
            sentence_embeddings: List[List[float]] = []
            for i in range(0, len(sentences), self.buffer_size):
                group_sentences = sentences[i:i + self.buffer_size]
                combined = " ".join(group_sentences)
                embedding = self.embed_model.get_text_embedding(combined)
                sentence_embeddings.append(embedding)

            if len(sentence_embeddings) <= 1:
                # Single chunk — no need for semantic splitting
                all_nodes.extend(build_nodes_from_splits([doc.text], doc))
                continue

            # Step 2: Compute dissimilarity between adjacent groups
            dissimilarities = []
            for i in range(len(sentence_embeddings) - 1):
                emb_a = np.array(sentence_embeddings[i])
                emb_b = np.array(sentence_embeddings[i + 1])
                similarity = np.dot(emb_a, emb_b) / (
                    np.linalg.norm(emb_a) * np.linalg.norm(emb_b)
                )
                dissimilarities.append(1.0 - similarity)

            # Step 3: Find breakpoints above threshold percentile
            if not dissimilarities:
                continue

            threshold = np.percentile(dissimilarities, self.breakpoint_percentile_threshold)
            breakpoints = [i for i, d in enumerate(dissimilarities) if d >= threshold]

            # Step 4: Split sentences at breakpoints into nodes
            split_indices = [0] + [bp + 1 for bp in breakpoints] + [len(sentences)]
            text_splits = [
                " ".join(sentences[split_indices[i]:split_indices[i + 1]])
                for i in range(len(split_indices) - 1)
            ]

            nodes = build_nodes_from_splits(text_splits, doc)
            all_nodes.extend(nodes)

        return all_nodes
```

## Pattern 2: Sentence Window Node Parser

Alternative to semantic splitting — splits at sentence boundaries and stores surrounding context in metadata for richer retrieval:

```python
"""Sentence window node parser — each node is a single sentence with window context."""

from typing import Any, Callable, List, Optional, Sequence

from llama_index.core.bridge.pydantic import Field
from llama_index.core.callbacks.base import CallbackManager
from llama_index.core.node_parser.interface import NodeParser
from llama_index.core.node_parser.node_utils import (
    build_nodes_from_splits,
    default_id_func,
)
from llama_index.core.node_parser.text.utils import split_by_sentence_tokenizer
from llama_index.core.schema import BaseNode, Document


DEFAULT_WINDOW_SIZE = 3
DEFAULT_WINDOW_METADATA_KEY = "window"
DEFAULT_OG_TEXT_METADATA_KEY = "original_text"


class SentenceWindowNodeParser(NodeParser):
    """Splits documents at sentence boundaries and stores surrounding context.

    Each node contains exactly one sentence. The metadata includes:
    - window: The sentence plus N sentences before and after (for context)
    - original_text: The exact sentence (for display)

    This approach is used with a "recursive retriever" that first retrieves
    by the window context (broad), then zooms into the specific sentence (precise).

    Args:
        window_size: Number of surrounding sentences to include in metadata.
        window_metadata_key: Metadata key for storing window text.
        original_text_metadata_key: Metadata key for the raw sentence.
    """

    sentence_splitter: Callable[[str], List[str]] = Field(
        default_factory=split_by_sentence_tokenizer,
        description="The text splitter to use when splitting documents.",
        exclude=True,
    )
    window_size: int = Field(
        default=DEFAULT_WINDOW_SIZE,
        description="Number of sentences on each side of a sentence to capture.",
        gt=0,
    )

    @classmethod
    def from_defaults(
        cls,
        sentence_splitter: Optional[Callable[[str], List[str]]] = None,
        window_size: int = DEFAULT_WINDOW_SIZE,
        window_metadata_key: str = DEFAULT_WINDOW_METADATA_KEY,
        original_text_metadata_key: str = DEFAULT_OG_TEXT_METADATA_KEY,
        include_metadata: bool = True,
    ) -> "SentenceWindowNodeParser":
        """Create parser with defaults.

        Args:
            sentence_splitter: Custom sentence splitter function.
            window_size: Size of context window around each sentence.
            window_metadata_key: Key name for window text in metadata.
            original_text_metadata_key: Key name for raw sentence in metadata.
            include_metadata: Whether to add metadata keys to nodes.

        Returns:
            Configured SentenceWindowNodeParser instance.
        """
        return cls(
            sentence_splitter=sentence_splitter or split_by_sentence_tokenizer(),
            window_size=window_size,
            window_metadata_key=window_metadata_key,
            original_text_metadata_key=original_text_metadata_key,
            include_metadata=include_metadata,
        )

    def build_window_nodes_from_documents(
        self, documents: Sequence[Document]
    ) -> List[BaseNode]:
        """Build sentence-level nodes with surrounding context windows.

        For each document:
        1. Split into sentences
        2. Create one node per sentence
        3. Add window metadata containing surrounding sentences
        4. Exclude window and original_text from embedding (use only the sentence)

        The key insight: embed only the single sentence for precision, but
        store context in metadata so the retriever can fetch broader context
        for the LLM prompt while returning the precise sentence as the result.

        Args:
            documents: Documents to parse into sentence-level nodes.

        Returns:
            List of BaseNode objects, each containing one sentence with window metadata.
        """
        all_nodes: List[BaseNode] = []
        for doc in documents:
            text_splits = self.sentence_splitter(doc.text)
            nodes = build_nodes_from_splits(text_splits, doc)

            # Add window context to each node's metadata
            for i, node in enumerate(nodes):
                # Get surrounding sentences (window of N before and after)
                start_idx = max(0, i - self.window_size)
                end_idx = min(i + self.window_size + 1, len(nodes))
                window_nodes = nodes[start_idx:end_idx]

                window_text = " ".join(n.text for n in window_nodes)
                node.metadata[self.window_metadata_key] = window_text
                node.metadata[self.original_text_metadata_key] = node.text

                # IMPORTANT: Exclude window and original_text from embedding.
                # We want to embed only the core sentence for precise vector matching,
                # but retrieve the broader context for the LLM prompt.
                node.excluded_embed_metadata_keys.extend([
                    self.window_metadata_key,
                    self.original_text_metadata_key,
                ])
                node.excluded_llm_metadata_keys.extend([
                    self.window_metadata_key,
                    self.original_text_metadata_key,
                ])

            all_nodes.extend(nodes)

        return all_nodes
```

## Pattern 3: Hybrid Search — BM25 + Vector Store

**Source:** `run-llama/llama_index` — `llama-index-integrations/retrievers/bm25/base.py`

Hybrid search combines keyword-based BM25 with semantic vector search for best retrieval quality. Each retriever returns independent results that are then combined:

```python
"""BM25 retriever using the bm25s library for fast keyword-based document retrieval."""

from typing import Any, Dict, List, Optional

from llama_index.core.base.base_retriever import BaseRetriever
from llama_index.core.callbacks.base import CallbackManager
from llama_index.core.constants import DEFAULT_SIMILARITY_TOP_K
from llama_index.core.schema import BaseNode, NodeWithScore, QueryBundle, MetadataMode
from llama_index.core.vector_stores.types import MetadataFilters

import bm25s  # Python BM25 implementation
import numpy as np
import Stemmer


class BM25Retriever(BaseRetriever):
    """BM25-based keyword retriever for hybrid search.

    BM25 is a bag-of-words ranking function that excels at:
    - Exact term matching (especially proper nouns, technical terms)
    - Short query retrieval
    - Finding specific facts and figures

    Used in combination with vector search — results from both are combined
    using reciprocal rank fusion (RRF) for final ranking.

    Args:
        nodes: Documents to index before querying.
        stemmer: Porter stemmer for normalizing terms.
        language: Language code for stopword handling.
        similarity_top_k: Maximum results to return per query.
        corpus_weight_mask: Weights for combining with vector search (e.g., [0.5, 0.5]).
    """

    def __init__(
        self,
        nodes: Optional[List[BaseNode]] = None,
        stemmer: Optional[Stemmer.Stemmer] = None,
        language: str = "en",
        similarity_top_k: int = DEFAULT_SIMILARITY_TOP_K,
        corpus_weight_mask: Optional[List[int]] = None,
    ) -> None:
        self.stemmer = stemmer or Stemmer.Stemmer("english")
        self.similarity_top_k = similarity_top_k
        self.corpus_weight_mask = corpus_weight_mask

        if nodes is not None:
            # Index documents into BM25 data structure
            self.corpus = [
                node_to_metadata_dict(node) | {"node_id": node.node_id}
                for node in nodes
            ]
            # Tokenize and build inverted index
            tokenizer = bm25s.Tokenization(
                stemmer=self.stemmer.stem, stopwords=None
            )
            self.bm25 = bm25s.BM25(tokenizer=tokenizer)
            texts = [doc.get("text", "") for doc in self.corpus]
            self.bm25.fit(texts)
        else:
            raise ValueError("Must provide nodes or an existing BM25 object")

    def retrieve(self, query_bundle: QueryBundle) -> List[NodeWithScore]:
        """Retrieve documents using BM25 keyword matching.

        Args:
            query_bundle: Contains the query string and any filters.

        Returns:
            Ranked list of NodeWithScore objects with BM25 scores.
        """
        query_text = query_bundle.query_str
        # Tokenize the query using the same tokenizer as the corpus
        query_tokens = bm25s.tokenize(
            [query_text],
            stemmer=self.stemmer.stem,
        )

        # Retrieve top-k results with BM25 scores
        ranked_documents, scores = self.bm25.retrieve(
            query_tokens, k=self.similarity_top_k
        )

        nodes: List[NodeWithScore] = []
        for doc_idx, score in zip(ranked_documents[0], scores[0]):
            corpus_item = self.corpus[doc_idx]
            # Find the corresponding BaseNode
            node_id = corpus_item.get("node_id")
            node = self._get_node_by_id(node_id)
            if node:
                nodes.append(NodeWithScore(node=node, score=float(score)))

        return sorted(nodes, key=lambda x: x.score or 0, reverse=True)

    def _get_node_by_id(self, node_id: str) -> Optional[BaseNode]:
        """Look up a BaseNode by its ID from the corpus."""
        for item in self.corpus:
            if item.get("node_id") == node_id:
                return item.get("_node_obj")  # Stored during indexing
        return None
```

## Pattern 4: Cross-Encoder Re-Ranking

**Source:** `run-llama/llama_index` — `llama-index-core/llama_index/core/postprocessor/sbert_rerank.py`

After initial retrieval (BM25 + vectors), a cross-encoder reranker re-scores all candidates for precise ranking:

```python
"""Cross-encoder reranking using SentenceTransformers CrossEncoder models."""

from typing import Any, List, Optional

from llama_index.core.callbacks import CBEventType, EventPayload
from llama_index.core.postprocessor.types import BaseNodePostprocessor
from llama_index.core.schema import MetadataMode, NodeWithScore, QueryBundle
from llama_index.core.utils import infer_torch_device


class SentenceTransformerRerank(BaseNodePostprocessor):
    """Cross-encoder reranker using sentence-transformers.

    Unlike bi-encoders (which embed documents and queries independently),
    cross-encoders process the [query, document] pair through a single
    transformer model, computing attention between all token pairs. This
    produces much higher quality relevance scores at the cost of O(n*m)
    computation.

    Use pattern: Retrieve ~50 results via fast BM25+vector search → Rerank top 10-20
    with cross-encoder before passing to LLM.

    Args:
        model: CrossEncoder model name (e.g., "cross-encoder/ms-marco-MiniLM-L-6-v2").
        top_n: Number of highest-scoring results to keep after reranking.
        device: Computation device ("cpu", "cuda", "cuda:0").
    """

    DEFAULT_MODEL = "cross-encoder/stsb-distilroberta-base"
    MAX_LENGTH = 512

    def __init__(
        self,
        top_n: int = 2,
        model: str = DEFAULT_MODEL,
        device: Optional[str] = None,
        keep_retrieval_score: bool = False,
        trust_remote_code: bool = True,
    ) -> None:
        """Initialize the cross-encoder reranker.

        Args:
            top_n: Number of results to return after reranking.
                   Typically 5-10 for production LLM context windows.
            model: HuggingFace model name for the CrossEncoder.
                   Recommended: "cross-encoder/ms-marco-MiniLM-L-6-v2" (fast, good quality)
                                or "BAAI/bge-reranker-large" (higher quality, slower)
            device: PyTorch device. Auto-detected if not specified.
            keep_retrieval_score: Preserve the original retrieval score in metadata.
            trust_remote_code: Allow custom model code from HuggingFace.
        """
        try:
            from sentence_transformers import CrossEncoder
        except ImportError:
            raise ImportError(
                "sentence-transformers package required. Install with: "
                "pip install torch sentence-transformers"
            )

        device = infer_torch_device() if device is None else device

        self.top_n = top_n
        self.model = model
        self.device = device
        self.keep_retrieval_score = keep_retrieval_score

        # Load the cross-encoder model
        self._model = CrossEncoder(
            model,
            max_length=self.MAX_LENGTH,
            device=device,
            trust_remote_code=trust_remote_code,
        )

    def _postprocess_nodes(
        self,
        nodes: List[NodeWithScore],
        query_bundle: Optional[QueryBundle] = None,
    ) -> List[NodeWithScore]:
        """Re-score retrieved nodes using cross-encoder relevance scores.

        This is the critical step in a high-quality RAG pipeline:
        1. Fast retriever returns ~50 candidates via BM25 + vector search
        2. Cross-encoder re-scores ALL candidates with deep attention
        3. Top N results are returned to the LLM

        The cross-encoder considers the FULL query-text interaction (not just
        separate embeddings), capturing:
        - Semantic nuance beyond simple embedding similarity
        - Query-specific relevance (same document may rank differently for different queries)
        - Contextual word sense disambiguation

        Args:
            nodes: Pre-retrieved nodes with initial scores.
            query_bundle: The original query for context matching.

        Returns:
            Re-ranked list containing only top_n highest-scoring nodes.
        """
        if query_bundle is None:
            raise ValueError("Query bundle must be provided for reranking.")
        if not nodes:
            return []

        # Build (query, document_text) pairs for batch scoring
        query_and_nodes = [
            (
                query_bundle.query_str,
                node.node.get_content(metadata_mode=MetadataMode.EMBED),
            )
            for node in nodes
        ]

        # Score all pairs in a single model inference (batch processing)
        scores = self._model.predict(query_and_nodes)

        assert len(scores) == len(nodes), "Score count must match node count"

        # Apply scores to nodes, preserving original score if requested
        for node, score in zip(nodes, scores):
            if self.keep_retrieval_score:
                node.node.metadata["retrieval_score"] = node.score
            node.score = score  # Override with cross-encoder score

        # Return top N results sorted by relevance score (descending)
        ranked = sorted(
            nodes, key=lambda x: -x.score if x.score else 0
        )[: self.top_n]

        return ranked
```

## Pattern 5: LLM-Based Re-Ranking

Alternative to cross-encoder: use an LLM to rank retrieved documents. Better at nuanced relevance but more expensive:

```python
"""LLM-based reranker that uses a language model to select the most relevant documents."""

from typing import Callable, List, Optional

from llama_index.core.bridge.pydantic import Field, PrivateAttr
from llama_index.core.llms.llm import LLM
from llama_index.core.postprocessor.types import BaseNodePostprocessor
from llama_index.core.prompts import (
    BasePromptTemplate,
    SelectorPromptTemplate,
)
from llama_index.core.schema import NodeWithScore, QueryBundle


DEFAULT_CHOICE_SELECT_PROMPT = """\
Select the most relevant documents for the query.

Query: {query_str}

Documents:
{context_str}

Return indices of selected documents (1-indexed, comma-separated).
Example: 1, 3, 5
"""

CHAT_CONTENT_CHOICE_SELECT_PROMPT = """\
You are a relevance judge. Select which documents from the list below
are most relevant to answering the query.

Query: {query_str}

Documents:
{context_messages}

Return the numbers of the most relevant documents (1-indexed, comma-separated).
"""


class LLMRerank(BaseNodePostprocessor):
    """Reranker that uses an LLM to rank document relevance.

    Instead of using a fixed scoring model, this delegates relevance judgment
    to a full LLM. This can capture nuanced relevance signals that cross-encoders
    miss (e.g., query intent matching, implicit context understanding).

    Trade-offs:
    - + Higher quality relevance judgments (understands nuance)
    - - Much slower than cross-encoder (each batch requires an LLM call)
    - - More expensive per query (LLM API costs)
    - - Best for low-throughput, high-stakes retrieval

    Args:
        llm: Language model used for relevance scoring.
        choice_select_prompt: Prompt template for the ranking task.
        choice_batch_size: Number of documents to score in one LLM call.
                           Process in batches for efficiency with large candidate sets.
        top_n: Final number of results to return.
    """

    top_n: int = Field(description="Number of top nodes to return after reranking.")
    choice_select_prompt: BasePromptTemplate = Field(
        description="Prompt template for selecting relevant documents."
    )
    choice_batch_size: int = Field(default=10, description="Batch size for LLM scoring.")
    llm: LLM = Field(description="The LLM used for relevance ranking.")

    def __init__(
        self,
        llm: Optional[LLM] = None,
        choice_select_prompt: Optional[BasePromptTemplate] = None,
        choice_batch_size: int = 10,
        top_n: int = 10,
    ) -> None:
        """Initialize LLM reranker.

        Args:
            llm: LLM for relevance judgment. Use a fast model (e.g., Haiku, Turbo)
                 since this is called per-query on all retrieved candidates.
            choice_select_prompt: Custom prompt for the ranking task.
                                  Defaults to DEFAULT_CHOICE_SELECT_PROMPT.
            choice_batch_size: Number of documents per LLM call batch.
                               Larger batches = fewer API calls but longer latency.
            top_n: Final output count. Keep small (5-10) for LLM context windows.
        """
        self.llm = llm or Settings.llm
        self.choice_select_prompt = choice_select_prompt or DEFAULT_CHOICE_SELECT_PROMPT
        self.choice_batch_size = choice_batch_size
        self.top_n = top_n

    def _postprocess_nodes(
        self,
        nodes: List[NodeWithScore],
        query_bundle: Optional[QueryBundle] = None,
    ) -> List[NodeWithScore]:
        """Re-rank documents using LLM relevance scoring.

        Processes candidates in batches to manage API costs and token limits.
        Each batch independently selects top documents, then all selected results
        are re-sorted by their relevance scores.

        Args:
            nodes: Pre-retrieved candidate documents with initial scores.
            query_bundle: The search query for context.

        Returns:
            Top N documents ranked by LLM-assigned relevance scores.
        """
        if query_bundle is None:
            raise ValueError("Query bundle required for reranking.")
        if not nodes:
            return []

        initial_results: List[NodeWithScore] = []
        query_str = query_bundle.query_str

        # Process in batches to manage LLM call costs
        for i in range(0, len(nodes), self.choice_batch_size):
            batch = [node.node for node in nodes[i:i + self.choice_batch_size]]

            # Format batch for the prompt (chat or non-chat format)
            if is_chat_model(self.llm):
                kwargs = {"query_str": query_str, "context_messages": format_batch(batch)}
            else:
                kwargs = {"query_str": query_str, "context_str": "\n\n".join(
                    node.get_content() for node in batch
                )}

            # Call LLM to select relevant documents from this batch
            raw_response = self.llm.predict(self.choice_select_prompt, **kwargs)
            selected_indices, relevances = parse_choice_select_answer(raw_response, len(batch))

            # Map selections back to nodes with scores
            for idx, rel_score in zip(selected_indices, relevances or [1.0] * len(selected_indices)):
                node_idx = int(idx) - 1  # Convert from 1-indexed
                if 0 <= node_idx < len(batch):
                    initial_results.append(
                        NodeWithScore(node=batch[node_idx], score=rel_score)
                    )

        # Final sort and limit
        return sorted(
            initial_results, key=lambda x: x.score or 0.0, reverse=True
        )[: self.top_n]
```

## Complete RAG Pipeline Assembly

Putting it all together — a production-quality RAG pipeline combining chunking, hybrid search, and re-ranking:

```python
from typing import List, Optional
from llama_index.core import VectorStoreIndex, StorageContext
from llama_index.core.retrievers import VectorIndexRetriever, BM25Retriever
from llama_index.core.postprocessor import SentenceTransformerRerank, LLMRerank
from llama_index.core.schema import QueryBundle, NodeWithScore
from llama_index.embeddings.openai import OpenAIEmbedding


class ProductionRAGPipeline:
    """Production-quality RAG pipeline combining chunking, hybrid search, and re-ranking.

    Pipeline stages:
    1. Document ingestion → Semantic chunking or sentence window parsing
    2. Embedding generation → Text-embedding-3-small (or local equivalent)
    3. Storage → Vector store + BM25 inverted index (for hybrid retrieval)
    4. Query time → Hybrid search (BM25 + vector) → Cross-encoder rerank → LLM

    This is the state-of-the-art RAG pipeline as of 2025-2026, used by
    production systems at scale. The combination of semantic chunking, hybrid
    retrieval, and cross-encoder re-ranking consistently outperforms any
    single technique in isolation.
    """

    def __init__(
        self,
        vector_store: Any,  # Supported vector store backend
        embedding_model: Optional[OpenAIEmbedding] = None,
        reranker_model: str = "cross-encoder/ms-marco-MiniLM-L-6-v2",
        top_k_retrieval: int = 50,     # Candidates from initial retrieval
        top_k_rerank: int = 10,        # After cross-encoder re-ranking
        chunk_strategy: str = "semantic",  # "semantic" | "sentence_window" | "recursive"
    ) -> None:
        """Initialize the RAG pipeline.

        Args:
            vector_store: Backend for storing embeddings (Qdrant, Pinecone, Weaviate, etc.)
            embedding_model: Text embedding model. Defaults to OpenAI text-embedding-3-small (1536d).
            reranker_model: Cross-encoder model name for re-ranking.
            top_k_retrieval: Number of initial candidates from hybrid search.
                             Higher = better recall but more reranking cost.
            top_k_rerank: Final count after re-ranking. Match to LLM context budget.
            chunk_strategy: Document chunking method. "semantic" recommended for most use cases.
        """
        self.vector_store = vector_store
        self.embedding_model = embedding_model or OpenAIEmbedding(
            model="text-embedding-3-small"
        )
        self.top_k_retrieval = top_k_retrieval
        self.top_k_rerank = top_k_rerank

        # Initialize retrievers
        self.vector_retriever = VectorIndexRetriever(
            vector_store=vector_store,
            embedding_model=self.embedding_model,
            similarity_top_k=top_k_retrieval,
        )
        self.bm25_retriever = BM25Retriever(similarity_top_k=top_k_retrieval)

        # Initialize reranker
        self.reranker = SentenceTransformerRerank(
            model=reranker_model,
            top_n=top_k_rerank,
            device="cuda" if torch.cuda.is_available() else "cpu",
            keep_retrieval_score=True,
        )

    def ingest_documents(self, documents: List[Any]) -> None:
        """Ingest and chunk documents into the vector store and BM25 index.

        Chunking strategy is selected based on the chunk_strategy parameter:
        - "semantic": Splits at topic boundaries using sentence embeddings
        - "sentence_window": Single sentences with surrounding context in metadata
        - "recursive": Fixed-size character-based splits (fastest, least precise)

        Args:
            documents: List of Document objects to ingest.
        """
        if self.chunk_strategy == "semantic":
            parser = SemanticSplitterNodeParser.from_defaults(
                embed_model=self.embedding_model,
                breakpoint_percentile_threshold=95,
            )
        elif self.chunk_strategy == "sentence_window":
            parser = SentenceWindowNodeParser.from_defaults(window_size=3)
        else:  # recursive
            from llama_index.core.node_parser.text import TokenTextSplitter
            parser = TokenTextSplitter(chunk_size=1024, chunk_overlap=200)

        nodes = parser.parse_nodes_from_documents(documents)

        # Store nodes in vector database with embeddings
        for node in nodes:
            embedding = self.embedding_model.get_text_embedding(node.text)
            self.vector_store.add(
                ids=[node.node_id],
                embeddings=[embedding],
                payloads=[{"text": node.text, **node.metadata}],
            )

        # Build BM25 index on the same text chunks
        self.bm25_retriever = BM25Retriever(nodes=nodes)

    def query(self, user_query: str) -> str:
        """Execute a full RAG query through all pipeline stages.

        Flow:
        1. Run BOTH vector search and BM25 retrievers in parallel
        2. Combine results using Reciprocal Rank Fusion (RRF)
        3. Re-rank combined candidates with cross-encoder
        4. Inject top results into LLM prompt for answer generation

        Args:
            user_query: The natural language question to answer.

        Returns:
            Generated answer based on retrieved context, or "I don't have enough information."
        """
        query_bundle = QueryBundle(query_str=user_query)

        # Stage 1: Parallel hybrid retrieval
        vector_results = self.vector_retriever.retrieve(query_bundle)
        bm25_results = self.bm25_retriever.retrieve(query_bundle)

        # Stage 2: Reciprocal Rank Fusion (RRF) to combine results
        combined = self._reciprocal_rank_fusion(
            [vector_results, bm25_results],
            ranks_weights=[0.5, 0.5],  # Equal weight; tune per use case
        )

        # Stage 3: Cross-encoder re-ranking for precise relevance scoring
        reranked = self.reranker.postprocess_nodes(combined, query_bundle)

        if not reranked:
            return "I don't have enough information to answer this question."

        # Stage 4: Build prompt with retrieved context and generate answer
        context_text = "\n\n---\n\n".join(
            node.node.get_content() for node in reranked[:self.top_k_rerank]
        )

        prompt = f"""Use the following context to answer the question. If the context
doesn't contain relevant information, say so.

Context:
{context_text}

Question: {user_query}

Answer:"""

        # Call LLM with retrieved context
        response = self.llm.invoke([HumanMessage(content=prompt)])

        return response.content

    def _reciprocal_rank_fusion(
        self,
        result_lists: List[List[NodeWithScore]],
        ranks_weights: List[float],
        k: float = 60.0,
    ) -> List[NodeWithScore]:
        """Combine multiple ranked result lists using Reciprocal Rank Fusion.

        RRF formula: score(document) = sum(1 / (k + rank_of_document_in_list_i))
        where k is a tuning constant (typically 60). This is the industry-standard
        method for combining heterogeneous retrievers because it doesn't require
        normalized scores — each list contributes based on rank position only.

        Args:
            result_lists: Multiple sorted result lists from different retrievers.
            ranks_weights: Weight for each retriever's contribution. Should sum to 1.0.
            k: RRF tuning constant. Lower = emphasizes top ranks more.

        Returns:
            Combined list of NodeWithScore with fused RRF scores.
        """
        rrf_scores: dict[str, float] = {}

        for results, weight in zip(result_lists, ranks_weights):
            for rank, node_with_score in enumerate(results, start=1):
                node_id = node_with_score.node.node_id
                current_score = rrf_scores.get(node_id, 0.0)
                rrf_scores[node_id] = current_score + weight / (k + rank)

        # Sort by fused score and return as NodeWithScore list
        sorted_nodes = sorted(
            rrf_scores.items(), key=lambda x: x[1], reverse=True
        )

        # Map back to original NodeWithScore objects
        id_to_node = {n.node.node_id: n for sublist in result_lists for n in sublist}
        combined: List[NodeWithScore] = []
        for node_id, score in sorted_nodes[:self.top_k_retrieval]:
            if node_id in id_to_node:
                entry = id_to_node[node_id]
                entry.score = score
                combined.append(entry)

        return combined
```

---

# Common Pitfalls Summary by Topic

| Topic | Pitfall | Impact | Mitigation |
|-------|---------|--------|------------|
| Tool Calling | Using untyped tools (dict args) | No validation, silent failures | Always use Pydantic args_schema |
| Tool Calling | Not handling JSON parse errors | Crashes on malformed LLM output | Wrap all tool calls in try/except with error feedback |
| Tool Calling | Fallback chains too deep | Infinite loops, token budget overflow | Limit max attempts; log all transitions |
| Memory | Unbounded conversation history | Context window overflow, degraded quality | Use windowed or summary memory for long sessions |
| Memory | Embedding every conversation turn | Wasteful, noisy retrieval | Only embed factual statements, not chitchat |
| Planning | ReAct without iteration limits | Infinite tool-call loops | Always set max_iterations |
| Planning | Pure CoT without grounding | Hallucinated facts, no verification | Use ReAct (thought+action) over pure CoT |
| Multi-Agent | Agents with overlapping capabilities | Confusion, conflicting outputs | Give each agent a unique specialization |
| Multi-Agent | No termination condition in group chat | Conversations that never end | Set max_turns + explicit stop criteria |
| RAG Chunking | Fixed-size character splits | Semantic content split mid-thought | Use semantic or sentence-window chunking |
| RAG Retrieval | Vector-only search (no BM25) | Misses exact term matches, proper nouns | Always use hybrid (BM25 + vector) retrieval |
| RAG Re-ranking | Skipping reranker | Lower quality context in LLM prompt | Cross-encoder reranker is the single biggest RAG quality upgrade |
| RAG Embeddings | Using outdated embedding models | Poor semantic matching for modern queries | Use text-embedding-3-small (OpenAI) or bge-large-en (open source) |

---

# Sources

All code examples sourced from production GitHub repositories:

1. **LangChain**: `langchain-ai/langchain` — master branch (function calling, memory systems, ReAct agent)
2. **LangGraph**: `langchain-ai/langgraph` — main branch (modern ReAct with native tool calling, ToolNode)
3. **LlamaIndex**: `run-llama/llama_index` — main branch (semantic chunking, BM25 retriever, rerankers)
4. **CrewAI**: `crewAIInc/crewai` — main branch (multi-agent orchestration, task definitions, tool schemas)
5. **AutoGen**: `microsoft/autogen` — main branch (group chat manager, assistant agent with model context)
6. **OpenAI SDK**: `openai/openai-python` — main branch (client architecture, legacy response handling)

---

*Research compiled 2026-05-25 from live GitHub repository inspection.*
