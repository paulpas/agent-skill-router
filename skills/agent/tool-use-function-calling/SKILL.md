---




name: tool-use-function-calling
description: Implements tool calling patterns (Pydantic-typed tools, function-to-schema conversion, parallel execution, fallback chains) for AI agent external API and service integration.
archetypes:
  - tactical
  - orchestration
anti_triggers:
  - brainstorming
  - vague ideation
  - design-only architecture
response_profile:
  verbosity: medium
  directive_strength: high
  abstraction_level: operational
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  triggers: tool calling, function calling, Pydantic tools, LangChain tools, tool use, parallel execution, fallback chain, typed tools
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: memory-systems, planning-reasoning, multi-agent-orchestration




---





# Tool Calling & Function Execution

Implements tool calling patterns that enable AI agents to interact with external APIs and services. Converts Python functions into LLM-callable tools with Pydantic input validation, dispatches parallel tool calls from model responses, handles execution errors with self-correction feedback, and implements ordered fallback chains for resilient agent behavior.

## TL;DR Checklist

- [ ] Define all tool schemas using Pydantic models before registering with the model
- [ ] Wrap every tool call in try/except with structured error formatting for LLM self-correction
- [ ] Execute independent tool calls in parallel, not sequentially
- [ ] Implement fallback chains ordered by exception type (connection → validation → rate limit)
- [ ] Validate all tool results against the expected schema before passing to downstream logic
- [ ] Reference `code-philosophy` (5 Laws of Elegant Defense) — parse input at boundaries, fail fast on invalid states

---

## When to Use

Use this skill when:

- Implementing an AI agent that needs to call external APIs, databases, or services
- Defining function-to-LLM-tool conversion with input validation and schema generation
- Building a multi-step agent workflow where the model must decide which tools to call
- Executing multiple independent tool calls from a single model response in parallel
- Handling tool execution errors so the LLM can self-correct and retry with adjusted parameters

---

## When NOT to Use

Avoid this skill for:

- Simple scripted API calls without LLM involvement — use direct HTTP clients instead
- Tools that must execute strictly sequentially due to data dependencies — sequential dispatch is faster than the overhead of parallel setup
- High-frequency inference contexts where every millisecond matters — tool call parsing and error handling add latency
- Situations where no external service integration is needed — pure text generation does not require tools

---

## Orchestration Flow

```
User Request → Model Generates Tool Call(s)
                        ↓
              ┌───────────────────────┐
              │  Parse Tool Invocation │
              │  (name + arguments)    │
              └───────────┬───────────┘
                          ↓
                  ┌───────────────┐
                  │ Parallel or   │
                  │ Sequential?   │
                  └───┬───────┬───┘
                      │       │
               Multiple    Single
              Independent  Tool Call
              Calls         │
                      ┌─────▼──────┐
                      │ Execute in │
                      │ parallel   │
                      └─────┬──────┘
                            ↓
                  ┌───────────────────────┐
                  │  Error Detection      │
                  │                       │
                  │  Success? ──► Collect │
                  │                       │     Results
                  │                       │
                  │  Fail? ──► Format     │
                  │                       │     → LLM with
                  │                       │     error msg
                  └──────┬────────┬───────┘
                         │        │
                  Retry?     Fallback
                   (LLM      Chain:
                    self-    1. Same tool,
                    correct)   different args
                      │       2. Alternative tool
                      ↓       3. Return error
                ┌───────────────┐
                │ Final Result  │
                │ to Model /    │
                │ User          │
                └───────────────┘
```

---

## Core Workflow

1. **Define Tool Schema** — Create Pydantic models for each tool's input parameters, then convert them into LLM-callable tools. Use `@tool` decorators or framework-native converters to generate JSON schemas from the model fields. **Checkpoint:** Verify each tool's schema includes a description, required fields, and type hints before registration.

2. **Execute Tool Call** — Parse model responses for tool invocations (function name + arguments). When multiple independent tools are called simultaneously, dispatch them concurrently using `asyncio.gather` or equivalent. For dependent tools, execute sequentially in the declared order. **Checkpoint:** Confirm each invocation's argument dictionary matches its Pydantic schema before calling.

3. **Handle Execution Errors** — Catch exceptions during tool execution and format them into a structured error message the LLM can understand. Include the original exception type, a human-readable description, and suggestions for self-correction (e.g., "You used an invalid argument name; try 'user_id' instead of 'userId'"). **Checkpoint:** Never swallow exceptions silently — every tool error must produce a response the LLM can act on.

4. **Parse Structured Output** — After successful tool execution, validate results against expected output schemas. For tools returning JSON, parse and validate before passing to downstream logic. For streaming tools, buffer partial outputs and reassemble before validation. **Checkpoint:** Reject malformed responses with a clear error that the LLM can use to retry.

5. **Implement Fallback Chains** — Define ordered lists of tool alternatives keyed by exception type. When a primary tool fails, the fallback chain tries alternative implementations: for `ConnectionError` try a cached or secondary endpoint; for `ValidationError` retry with corrected arguments provided by the LLM self-correction; for `RateLimitError` apply exponential backoff before retrying the same tool. **Checkpoint:** Enforce a maximum attempt limit across all fallback levels to prevent infinite loops.

---

## Implementation Patterns

### Pattern 1: Pydantic-Typed Tool Definition

Define tools using Pydantic models for automatic JSON schema generation and input validation. This ensures the LLM receives correct argument structures and that invalid inputs are caught before execution.

```python
"""
Pydantic-typed tool definitions for AI agent function calling.
All tools use Pydantic v2 BaseModel with Field descriptors for
automatic JSON schema generation and runtime validation.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator


# --- Input Schemas (Pydantic models auto-convert to JSON schema) ---

class SearchEngine(str, Enum):
    """Supported search engine backends."""
    GOOGLE = "google"
    BING = "bing"
    DUCKDUCKGO = "duckduckgo"


class WebSearchInput(BaseModel):
    """Input parameters for a web search tool call."""
    query: str = Field(
        description="The search query string. Must be 1-200 characters.",
        min_length=1,
        max_length=200,
    )
    engine: SearchEngine = Field(
        default=SearchEngine.DUCKDUCKGO,
        description="Search engine backend to use for the query",
    )
    max_results: int = Field(
        default=5,
        ge=1,
        le=20,
        description="Maximum number of results to return (1-20)",
    )

    @field_validator("query")
    @classmethod
    def sanitize_query(cls, v: str) -> str:
        """Strip whitespace and reject empty queries."""
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Search query must not be empty after trimming")
        return cleaned


class FetchURLInput(BaseModel):
    """Input parameters for fetching a web page content."""
    url: str = Field(
        description="The full URL to fetch. Must be a valid HTTP/HTTPS URL.",
    )
    timeout_seconds: float = Field(
        default=10.0,
        gt=0,
        le=60.0,
        description="Request timeout in seconds (0 < timeout <= 60)",
    )

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        """Basic URL validation — must start with http:// or https://."""
        if not (v.startswith("http://") or v.startswith("https://")):
            raise ValueError(f"URL must start with http:// or https://, got: {v[:30]}...")
        return v.strip()


class DatabaseQueryInput(BaseModel):
    """Input parameters for running a database query tool."""
    table_name: str = Field(
        description="Name of the database table to query",
        pattern=r"^[a-zA-Z_][a-zA-Z0-9_]*$",
    )
    filters: dict[str, Any] = Field(
        default_factory=dict,
        description="Key-value filters for WHERE clause conditions",
    )
    limit: int = Field(
        default=50,
        ge=1,
        le=500,
        description="Maximum rows to return",
    )


# --- Tool Registry ---

class ToolRegistry:
    """Central registry that maps tool names to their Pydantic input schemas and handlers."""

    def __init__(self) -> None:
        self._tools: dict[str, tuple[type[BaseModel], Any]] = {}

    def register(
        self,
        name: str,
        input_schema: type[BaseModel],
        handler: Any,
        description: str,
    ) -> None:
        """Register a tool with its Pydantic input schema and callable handler.

        Args:
            name: Unique tool name used by the LLM to invoke this tool.
            input_schema: Pydantic BaseModel subclass for input validation.
            handler: Async or sync callable that receives validated input dict.
            description: Human-readable description the model uses for tool selection.
        """
        if name in self._tools:
            raise ValueError(f"Tool '{name}' is already registered")

        # Generate JSON schema from Pydantic model for LLM function calling
        schema = input_schema.model_json_schema()
        self._tools[name] = (input_schema, handler, description, schema)

    def get_tools(self) -> list[dict[str, Any]]:
        """Return the list of tools in the format expected by most LLM providers.

        Returns a list of function-call schemas with name, description, and parameters.
        """
        result = []
        for name, (schema_cls, _handler, desc, full_schema) in self._tools.items():
            result.append({
                "name": name,
                "description": desc,
                "parameters": {
                    "type": "object",
                    "properties": full_schema.get("properties", {}),
                    "required": full_schema.get("required", []),
                    "$schema": "http://json-schema.org/draft-07/schema#",
                },
            })
        return result

    def get_schema(self, name: str) -> dict[str, Any] | None:
        """Look up a tool's full JSON schema by name.

        Returns None if the tool is not registered.
        """
        entry = self._tools.get(name)
        if entry is None:
            return None
        return {"name": name, "description": entry[2], "schema": entry[3]}


# --- Example Handlers (real implementations) ---

async def handle_web_search(input_dict: dict[str, Any]) -> list[dict[str, str]]:
    """Execute a web search and return structured results.

    Args:
        input_dict: Validated WebSearchInput as a dictionary.

    Returns:
        List of result dicts with 'title', 'url', and 'snippet' keys.
    """
    # In production, this would call an actual search API
    engine = input_dict.get("engine", SearchEngine.DUCKDUCKGO)
    query = input_dict["query"]
    max_results = input_dict["max_results"]

    # Placeholder: return mock results (replace with real HTTP call)
    results: list[dict[str, str]] = []
    for i in range(max_results):
        results.append({
            "title": f"Result {i+1} for '{query}'",
            "url": f"https://example.com/search/{i+1}",
            "snippet": f"Relevant snippet about {query} from {engine.value}",
        })

    return results


async def handle_fetch_url(input_dict: dict[str, Any]) -> str:
    """Fetch and return the text content of a URL.

    Args:
        input_dict: Validated FetchURLInput as a dictionary.

    Returns:
        The fetched page content as a string (truncated to 5000 chars).
    """
    import httpx

    url = input_dict["url"]
    timeout_seconds = input_dict["timeout_seconds"]

    async with httpx.AsyncClient(timeout=timeout_seconds) as client:
        response = await client.get(url)
        response.raise_for_status()
        content = response.text[:5000]  # Truncate to avoid oversized tool output
        return content


async def handle_database_query(input_dict: dict[str, Any]) -> list[dict[str, Any]]:
    """Query a database table with optional filters.

    Args:
        input_dict: Validated DatabaseQueryInput as a dictionary.

    Returns:
        List of row dicts matching the query conditions.
    """
    # In production, this would use an actual database connection
    table = input_dict["table_name"]
    limit = input_dict["limit"]
    filters = input_dict.get("filters", {})

    # Placeholder: return mock results (replace with real DB query)
    rows: list[dict[str, Any]] = [
        {k: f"value_{i}_{j}" for j, k in enumerate(sorted(filters.keys() or ["id", "name"]))}
        for i in range(limit)
    ]

    return rows


# --- Registration and Schema Export ---

def build_tool_registry() -> ToolRegistry:
    """Construct and configure the complete tool registry.

    Returns a fully-registered ToolRegistry with all available agent tools.
    """
    registry = ToolRegistry()

    registry.register(
        name="web_search",
        input_schema=WebSearchInput,
        handler=handle_web_search,
        description="Search the web for information using the specified engine. Returns up to max_results results.",
    )

    registry.register(
        name="fetch_url",
        input_schema=FetchURLInput,
        handler=handle_fetch_url,
        description="Fetch and return the text content of a given URL. Respects timeout settings.",
    )

    registry.register(
        name="query_database",
        input_schema=DatabaseQueryInput,
        handler=handle_database_query,
        description="Run a filtered query against a database table. Returns structured rows.",
    )

    return registry


# --- Tool Call Dispatch (for use with LLM function calling APIs) ---

def get_tools_for_llm(registry: ToolRegistry) -> list[dict[str, Any]]:
    """Convert a ToolRegistry into the tool format expected by OpenAI-compatible APIs.

    Each tool becomes a function definition with name, description, and JSON schema parameters.

    Args:
        registry: The configured ToolRegistry instance.

    Returns:
        List of tool definitions ready for model inference.
    """
    return registry.get_tools()
```

### Pattern 2: Parallel Tool Execution with Error Wrapping

When the LLM response contains multiple independent tool calls, execute them concurrently and wrap each in error handling so one failure doesn't collapse all results.

```python
"""
Parallel tool execution with comprehensive error wrapping.
Dispatches multiple tool calls from a single model response
concurrently, collects results and errors separately, and
formats everything back for LLM self-correction.
"""

from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import dataclass, field
from typing import Any, Optional

logger = logging.getLogger(__name__)


@dataclass
class ToolCallResult:
    """Structured result from executing a single tool call."""
    tool_name: str
    success: bool
    output: Optional[str] = None
    error_type: Optional[str] = None
    error_message: Optional[str] = None
    execution_time_ms: float = 0.0

    def to_error_feedback(self) -> str:
        """Format this result as a structured error message for the LLM.

        The error message includes the tool name, exception type, and a
        human-readable description so the model can self-correct on retry.
        """
        if self.success or not self.error_type:
            return ""
        return (
            f"Tool '{self.tool_name}' failed with {self.error_type}: {self.error_message}. "
            f"If arguments were invalid, check the required fields and try corrected values."
        )

    def to_dict(self) -> dict[str, Any]:
        """Serialize for storage or transmission."""
        return {
            "tool_name": self.tool_name,
            "success": self.success,
            "output": self.output,
            "error_type": self.error_type,
            "error_message": self.error_message,
            "execution_time_ms": round(self.execution_time_ms, 2),
        }


async def execute_tool_call(
    tool_name: str,
    arguments: dict[str, Any],
    handler: Any,
) -> ToolCallResult:
    """Execute a single tool call with timing and error wrapping.

    Args:
        tool_name: Name of the tool to invoke.
        arguments: Validated input arguments as a dictionary.
        handler: The callable that implements this tool's logic.

    Returns:
        A ToolCallResult with either the output or structured error info.
    """
    start_time = asyncio.get_event_loop().time()

    try:
        result = await handler(arguments)
        elapsed = (asyncio.get_event_loop().time() - start_time) * 1000
        return ToolCallResult(
            tool_name=tool_name,
            success=True,
            output=json.dumps(result) if not isinstance(result, str) else result,
            execution_time_ms=elapsed,
        )

    except json.JSONDecodeError as e:
        elapsed = (asyncio.get_event_loop().time() - start_time) * 1000
        logger.warning("Tool '%s' produced invalid JSON: %s", tool_name, e)
        return ToolCallResult(
            tool_name=tool_name,
            success=False,
            error_type="JSONDecodeError",
            error_message=f"Handler returned invalid JSON: {str(e)}",
            execution_time_ms=elapsed,
        )

    except ValueError as e:
        elapsed = (asyncio.get_event_loop().time() - start_time) * 1000
        logger.warning("Tool '%s' validation error: %s", tool_name, e)
        return ToolCallResult(
            tool_name=tool_name,
            success=False,
            error_type="ValidationError",
            error_message=f"Invalid argument or internal validation failed: {str(e)}",
            execution_time_ms=elapsed,
        )

    except ConnectionError as e:
        elapsed = (asyncio.get_event_loop().time() - start_time) * 1000
        logger.error("Tool '%s' connection failure: %s", tool_name, e)
        return ToolCallResult(
            tool_name=tool_name,
            success=False,
            error_type="ConnectionError",
            error_message=f"Could not reach the service endpoint: {str(e)}",
            execution_time_ms=elapsed,
        )

    except TimeoutError as e:
        elapsed = (asyncio.get_event_loop().time() - start_time) * 1000
        logger.warning("Tool '%s' timed out: %s", tool_name, e)
        return ToolCallResult(
            tool_name=tool_name,
            success=False,
            error_type="TimeoutError",
            error_message=f"Execution exceeded time limit: {str(e)}",
            execution_time_ms=elapsed,
        )

    except Exception as e:
        elapsed = (asyncio.get_event_loop().time() - start_time) * 1000
        logger.exception("Tool '%s' unexpected error: %s", tool_name, e)
        return ToolCallResult(
            tool_name=tool_name,
            success=False,
            error_type="UnexpectedError",
            error_message=f"Unhandled exception in {tool_name}: {type(e).__name__}: {str(e)}",
            execution_time_ms=elapsed,
        )


async def execute_tool_calls_parallel(
    calls: list[dict[str, Any]],
    tool_handlers: dict[str, Any],
    max_concurrent: int = 5,
) -> list[ToolCallResult]:
    """Execute multiple independent tool calls concurrently.

    Each call is dispatched as a coroutine wrapped in try/except via
    execute_tool_call(). Results are collected preserving the original
    call order so they can be mapped back to the model's output.

    Args:
        calls: List of dicts with 'tool_name' and 'arguments' keys.
               Each entry represents one tool invocation from an LLM response.
        tool_handlers: Dict mapping tool name → async handler function.
        max_concurrent: Maximum number of concurrent executions (default 5).

    Returns:
        List of ToolCallResult instances in the same order as input calls.
    """
    if not calls:
        return []

    semaphore = asyncio.Semaphore(max_concurrent)

    async def _bounded_execute(call: dict[str, Any]) -> ToolCallResult:
        """Execute a single call with concurrency limiting."""
        tool_name = call["tool_name"]
        arguments = call.get("arguments", {})

        handler = tool_handlers.get(tool_name)
        if handler is None:
            return ToolCallResult(
                tool_name=tool_name,
                success=False,
                error_type="UnknownTool",
                error_message=f"No handler registered for tool '{tool_name}'",
            )

        async with semaphore:
            return await execute_tool_call(tool_name, arguments, handler)

    # Dispatch all calls concurrently (bounded by semaphore)
    tasks = [_bounded_execute(call) for call in calls]
    results: list[ToolCallResult] = await asyncio.gather(*tasks)

    return list(results)


def format_tool_results_for_llm(
    results: list[ToolCallResult],
    tool_names: list[str],
) -> str:
    """Format parallel tool execution results back into a message the LLM can consume.

    Success outputs are included directly. Failed tools include structured error
    messages that describe the failure mode so the LLM can self-correct arguments
    or try alternative approaches.

    Args:
        results: ToolCallResult instances from execute_tool_calls_parallel().
        tool_names: Corresponding tool names for context.

    Returns:
        A formatted string containing all outputs and error messages.
    """
    parts: list[str] = []

    for result, name in zip(results, tool_names):
        if result.success:
            parts.append(f"[TOOL_OUTPUT:{name}] {result.output}")
        else:
            feedback = result.to_error_feedback()
            if feedback:
                parts.append(f"[TOOL_ERROR:{name}] {feedback}")
            else:
                parts.append(f"[TOOL_ERROR:{name}] Unknown failure — check tool '{name}' implementation")

    return "\n\n".join(parts)


# --- BAD vs. GOOD Example ---

# ❌ BAD: Sequential execution when calls are independent — wastes time
async def bad_parallel_execution(calls, handlers):
    results = []
    for call in calls:
        # Waits for each call to finish before starting the next
        result = await execute_tool_call(call["tool_name"], call.get("arguments", {}), handlers[call["tool_name"]])
        results.append(result)
    return results

# ✅ GOOD: Use asyncio.gather() for concurrent execution of independent tools
async def good_parallel_execution(calls, handlers):
    # All independent calls fire simultaneously, bounded by concurrency limit
    return await execute_tool_calls_parallel(calls, handlers)
```

### Pattern 3: Fallback Chain Implementation

Define ordered fallback tool chains keyed by exception type. When a primary tool fails, the system tries alternatives based on what kind of error occurred — connection errors try cached endpoints, validation errors retry with corrected arguments, and rate limits apply backoff.

```python
"""
Fallback chain implementation for resilient tool execution.
Maps exception types to ordered alternative tools, enforcing
maximum attempt limits to prevent infinite retry loops.
"""

from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Optional


@dataclass(frozen=True)
class FallbackConfig:
    """Configuration for a single fallback level in the chain.

    Attributes:
        tool_name: The alternative tool to try.
        condition: Lambda or callable that returns True if this fallback applies.
                   Receives the exception from the failed tool.
        backoff_seconds: Seconds to wait before trying this fallback (0 = immediate).
        description: Human-readable explanation of when this fallback triggers.
    """
    tool_name: str
    condition: Callable[[BaseException], bool]
    backoff_seconds: float = 0.0
    description: str = ""


@dataclass
class ExecutionAttempt:
    """Tracks a single attempt at executing a tool (primary or fallback)."""
    tool_name: str
    arguments: dict[str, Any]
    attempt_number: int
    success: bool = False
    error_type: Optional[str] = None
    error_message: Optional[str] = None
    result_output: Optional[str] = None
    retries_used: int = 0

    @property
    def is_terminal(self) -> bool:
        """Return True if this attempt exhausted all fallback options."""
        return not self.success and self.retries_used >= self._max_allowed_retries()

    @staticmethod
    def _max_allowed_retries() -> int:
        """Global maximum retries to prevent infinite loops (Law 4: Fail Fast)."""
        return 5


class FallbackChain:
    """Ordered chain of tool alternatives with exception-based routing.

    A FallbackChain wraps a primary tool and one or more fallback tools,
    each triggered by specific exception types. When the primary fails, the
    chain evaluates conditions in order and tries the first matching fallback.
    After all fallbacks are exhausted, the last error is returned to the LLM.

    Attributes:
        primary_tool_name: The name of the main tool to attempt first.
        fallbacks: Ordered list of FallbackConfig entries.
    """

    def __init__(self, primary_tool_name: str, fallbacks: list[FallbackConfig]) -> None:
        """Initialize a fallback chain with a primary tool and optional alternatives.

        Args:
            primary_tool_name: The main tool name for this chain.
            fallbacks: Ordered list of fallback configurations, evaluated top-to-bottom.
                       Earlier entries are tried first on matching exceptions.
        """
        self.primary_tool_name = primary_tool_name
        self.fallbacks = fallbacks

    def get_all_tools(self) -> list[str]:
        """Return the ordered list of all tools in this chain (primary + fallbacks)."""
        tools = [self.primary_tool_name]
        for fb in self.fallbacks:
            if fb.tool_name not in tools:
                tools.append(fb.tool_name)
        return tools

    def select_fallback(self, exception: BaseException) -> Optional[FallbackConfig]:
        """Find the first fallback whose condition matches the given exception.

        Args:
            exception: The exception raised by the primary or previous fallback tool.

        Returns:
            The first matching FallbackConfig, or None if no fallback applies.
        """
        for fallback in self.fallbacks:
            try:
                if fallback.condition(exception):
                    return fallback
            except Exception as condition_err:
                # If the condition itself throws, skip this fallback and try next
                continue
        return None


async def execute_with_fallback_chain(
    tool_name: str,
    arguments: dict[str, Any],
    handlers: dict[str, Callable[..., Any]],
    chains: dict[str, FallbackChain],
) -> dict[str, Any]:
    """Execute a tool call with automatic fallback chain resolution.

    When the primary tool fails, this function examines the exception type,
    finds the first matching fallback in the registered chains, and retries
    with the alternative tool. The process repeats for each level until
    success or exhaustion of all fallbacks.

    Args:
        tool_name: The primary tool to attempt first.
        arguments: Validated input arguments.
        handlers: Dict mapping all tool names → their handler functions.
        chains: Dict mapping tool name → its configured FallbackChain.

    Returns:
        A dict with keys: 'success', 'tool_used', 'output' (on success),
        or 'success', 'tool_used', 'error_type', 'error_message' (on failure).
    """
    # Guard clause: Early Exit (Law 1)
    if not tool_name:
        return {
            "success": False,
            "tool_used": None,
            "error_type": "ValidationError",
            "error_message": "Tool name must not be empty",
        }

    chain = chains.get(tool_name)
    # If no chain registered for this tool, just execute once
    if chain is None:
        handler = handlers.get(tool_name)
        if handler is None:
            return {
                "success": False,
                "tool_used": None,
                "error_type": "UnknownTool",
                "error_message": f"No handler found for tool '{tool_name}'",
            }

        try:
            result = await handler(arguments)
            return {"success": True, "tool_used": tool_name, "output": str(result)}
        except Exception as e:
            return {
                "success": False,
                "tool_used": tool_name,
                "error_type": type(e).__name__,
                "error_message": str(e),
            }

    # Build ordered tool list from chain
    all_tools = chain.get_all_tools()
    last_exception: Optional[BaseException] = None
    attempt_count = 0

    for tool_to_try in all_tools:
        if attempt_count >= ExecutionAttempt._max_allowed_retries():
            break

        handler = handlers.get(tool_to_try)
        if handler is None:
            last_exception = ValueError(f"No handler registered for '{tool_to_try}'")
            attempt_count += 1
            continue

        # Apply backoff before fallback attempts (not the first try)
        if tool_to_try != chain.primary_tool_name:
            fb_config = chain.select_fallback(last_exception) if last_exception else None
            if fb_config and fb_config.backoff_seconds > 0:
                await asyncio.sleep(fb_config.backoff_seconds)

        try:
            result = await handler(arguments)
            return {
                "success": True,
                "tool_used": tool_to_try,
                "output": str(result),
            }

        except Exception as e:
            last_exception = e
            attempt_count += 1
            continue

    # All tools exhausted — return the last error to the caller (LLM self-correction)
    return {
        "success": False,
        "tool_used": all_tools[-1] if all_tools else None,
        "error_type": type(last_exception).__name__ if last_exception else "Unknown",
        "error_message": str(last_exception) if last_exception else "All fallback attempts exhausted",
    }


# --- Example: Building a Realistic Fallback Chain ---

def build_search_fallback_chain() -> FallbackChain:
    """Create a search tool with layered fallbacks.

    Primary: live web search via DuckDuckGo
    Fallback 1: Bing API (for connection errors to DuckDuckGo)
    Fallback 2: Local cached results with staleness warning (for validation errors or rate limits)
    """
    return FallbackChain(
        primary_tool_name="web_search_duckduckgo",
        fallbacks=[
            FallbackConfig(
                tool_name="web_search_bing",
                condition=lambda e: isinstance(e, ConnectionError),
                backoff_seconds=0.5,
                description="Primary search unreachable — try Bing API as alternative provider",
            ),
            FallbackConfig(
                tool_name="web_search_cached",
                condition=lambda e: isinstance(e, (ConnectionError, TimeoutError, ValueError)),
                backoff_seconds=1.0,
                description="All live search providers failed — return locally cached results with staleness warning",
            ),
        ],
    )


def build_db_fallback_chain() -> FallbackChain:
    """Create a database query tool with layered fallbacks.

    Primary: PostgreSQL via async driver
    Fallback 1: Read replica (for connection errors to primary)
    Fallback 2: SQLite file cache (for validation or rate-limit errors)
    """
    return FallbackChain(
        primary_tool_name="query_postgres",
        fallbacks=[
            FallbackConfig(
                tool_name="query_postgres_replica",
                condition=lambda e: isinstance(e, ConnectionError),
                backoff_seconds=0.25,
                description="Primary PostgreSQL unreachable — try read replica",
            ),
            FallbackConfig(
                tool_name="query_sqlite_cache",
                condition=lambda e: isinstance(e, (ConnectionError, TimeoutError, ValueError)),
                backoff_seconds=0.5,
                description="All database endpoints failed — return from SQLite cache",
            ),
        ],
    )
```

---

## Constraints

### MUST DO
- Define all tool input schemas with Pydantic models before registering them — never use raw dicts for LLM-facing tool definitions
- Wrap every tool execution in try/except that catches at least `ConnectionError`, `TimeoutError`, and a generic `Exception` handler
- Execute independent tool calls concurrently using `asyncio.gather()` or equivalent, not sequentially
- Format error messages for LLM self-correction: include the exception type, what went wrong, and what to try next
- Validate all tool results against expected output schemas before passing downstream
- Implement fallback chains with a maximum attempt limit (5 attempts is recommended) to prevent infinite loops
- Use guard clauses at the top of every tool handler — return early on empty/invalid input (Early Exit, Law 1)
- Reference `code-philosophy` (5 Laws of Elegant Defense): parse input at boundaries, fail fast on invalid states, never mutate inputs

### MUST NOT DO
- Execute tool calls sequentially when they are independent — this wastes wall-clock time and frustrates users
- Catch bare `Exception` without also providing a more specific handler — always catch domain-specific exceptions first
- Swallow exceptions silently or log without returning structured feedback to the LLM
- Skip validation of tool arguments before calling the handler — let Pydantic enforce schema at the boundary
- Use magic numbers for retry counts, timeouts, or backoff intervals — make them configurable parameters
- Allow a fallback chain to retry more than 5 total attempts across all levels without explicit operator approval
- Return raw exception tracebacks to the LLM — format errors into concise, actionable descriptions

---

## TL;DR for Code Generation

- Use Pydantic BaseModel subclasses with Field descriptors for every tool's input schema
- All handler functions must accept a `dict[str, Any]` and return a serializable type (str, list, dict)
- Wrap tool dispatch in `asyncio.gather()` for independent calls; use sequential await only for data-dependent calls
- Every try/except block must include at minimum: ConnectionError, TimeoutError, ValueError, and a generic Exception catch-all
- Fallback chains are lists of (tool_name, condition_func) — condition is called with the caught exception
- Maximum 5 total attempts across all primary + fallback levels; enforce via counter
- Tool descriptions must be specific and actionable so the LLM can make informed selection decisions

---

## Related Skills

| Skill | Purpose |
|---|---|
| `memory-systems` | Store tool call history, results, and errors in agent memory for context-aware retries |
| `planning-reasoning` | Plan multi-step workflows where the model determines the sequence of tool calls needed |
| `multi-agent-orchestration` | Route tool calling responsibilities across multiple specialized agents with coordinated delegation |

---

## Live References

> Authoritative documentation links for tool calling and function calling in AI agent systems.

- [OpenAI Function Calling Documentation](https://platform.openai.com/docs/guides/function-calling)
- [Pydantic v2 Model_json_schema Reference](https://docs.pydantic.dev/latest/api/base_model/)
- [LangChain Tool Definition Patterns](https://python.langchain.com/docs/modules/agents/tools/custom_tools)
- [Google Gemini Function Calling Guide](https://ai.google.dev/gemini-api/docs/function-calling)
- [Anthropic Tool Use Documentation](https://docs.anthropic.com/en/docs/build-with-claude/tool-use)
