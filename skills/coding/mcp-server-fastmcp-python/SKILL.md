---
name: mcp-server-fastmcp-python
description: Implements FastMCP v3.x/4.0.0b1 server development using Python SDK v2 with Pydantic validation, transport selection, resource/tool/prompt management, and production-grade error handling for building MCP servers.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: fastmcp, mcp server python, how do i create an mcp server, tool registration, pydantic validation, mcp transport, streamable http
  role: implementation
  scope: implementation
  output-format: code
  related-skills: ai-llm-agentic-tooling-mcp, mcp-client-integration, mcp-tool-design-patterns
  archetypes: tactical, generation
  anti_triggers: brainstorming, vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
---

# FastMCP Server Implementation

FastMCP is a Python framework that simplifies MCP (Model Context Protocol) server development. Loading this skill makes you capable of building fully-featured MCP servers with Pydantic-validated tools, dynamic resources, prompt templates, and production-grade error handling using the FastMCP v3.x/4.0.0b1 SDK with Python 3.10+.

## TL;DR Checklist

- [ ] Install: `pip install fastmcp pydantic`
- [ ] Create server with `@mcp.tool` and `@mcp.resource` decorators
- [ ] Validate inputs with Pydantic models, not raw strings
- [ ] Use `McpError` for structured error responses, never raise bare `Exception`
- [ ] Choose transport: stdio (local CLI tools), HTTP/Streamable (integrations)
- [ ] Never `print()` on stdio transport — use logging module
- [ ] Test with `mcp dev` CLI before deploying to production

---

## When to Use

Use this skill when:

- Building a new MCP server from scratch in Python
- Integrating existing Python functions as MCP tools
- Exposing APIs or resources through the MCP protocol
- Creating reusable prompt templates for LLM clients
- Implementing production-grade tool registration with validation
- Debugging or fixing errors in an existing FastMCP server
- Choosing between stdio vs HTTP transport for your server

---

## When NOT to Use

Avoid this skill for:

- Building MCP clients (use `mcp-client-integration` instead)
- Designing tool interfaces (use `mcp-tool-design-patterns` instead)
- Security and authorization policies (use `mcp-security-authorization` instead)
- General MCP protocol questions without Python context
- Non-Python MCP servers (JavaScript/Rust/Go have different SDKs)

---

## Core Workflow

1. **Define Server Class and Transport** — Create a FastMCP server instance with transport selection (stdio for local, HTTP/Streamable for remote). **Checkpoint:** Verify `mcp` object is properly initialized.

2. **Design Tool Signatures** — Sketch tool names, input parameters as Pydantic models, and expected outputs. Define constraints (required fields, ranges, validation rules) in Pydantic `Field()` definitions. **Checkpoint:** Validate each tool solves ONE specific problem.

3. **Register Tools with Decorators** — Use `@mcp.tool()` decorator with docstring describing behavior. Input validation is automatic via Pydantic. **Checkpoint:** Verify all tool parameters are type-hinted.

4. **Implement Resource Management** — Register static URIs (read-only data) and dynamic URIs (computed on-demand) with `@mcp.resource()` decorators. Define content MIME types. **Checkpoint:** Test resource retrieval with sample URIs.

5. **Add Prompt Templates** — Create reusable prompt templates with `@mcp.prompt()` decorator for common LLM use cases. Include template arguments as Pydantic models. **Checkpoint:** Verify all templates are self-documenting.

6. **Implement Error Handling** — Catch errors from tool execution, convert to `McpError` with proper error codes, never expose raw tracebacks. **Checkpoint:** Test error paths; verify all errors return diagnostic messages.

7. **Run and Validate Server** — Start server with `mcp.run()`, test with `mcp dev` CLI, verify tools/resources/prompts are discoverable. **Checkpoint:** Confirm server starts without stderr pollution on stdio transport.

---

## Implementation Patterns

### Pattern 1: Tool Registration with Pydantic Validation

**Problem:** Tool inputs must be validated before execution. Raw string parameters are unsafe.

**Solution:** Use Pydantic models for all tool inputs. FastMCP automatically converts JSON to Pydantic instances and validates constraints.

```python
from fastmcp import FastMCP
from pydantic import BaseModel, Field
from typing import Optional

# Initialize server with stdio transport (for local CLI usage)
mcp = FastMCP(name="weather-service", version="1.0.0")

# Define input schema as Pydantic model
class WeatherQuery(BaseModel):
    """Request schema for weather lookup."""
    location: str = Field(
        ...,
        description="City name or coordinates (e.g., 'San Francisco' or '37.7749,-122.4194')",
        min_length=1,
        max_length=200,
    )
    units: str = Field(
        default="celsius",
        description="Temperature units: celsius, fahrenheit, kelvin",
        pattern="^(celsius|fahrenheit|kelvin)$",
    )
    forecast_days: int = Field(
        default=1,
        description="Number of forecast days (1-14)",
        ge=1,
        le=14,
    )

@mcp.tool()
def get_weather(query: WeatherQuery) -> dict:
    """Fetch current weather and forecast for a location.
    
    Args:
        query: WeatherQuery containing location, units, and forecast days.
    
    Returns:
        Dictionary with current conditions and forecast array.
    
    Raises:
        McpError: If location is not found or API fails.
    """
    # At this point, query is already validated by Pydantic
    # location is guaranteed to be 1-200 characters
    # units matches the regex pattern
    # forecast_days is between 1-14
    
    try:
        # Simulate API call
        if query.location.lower() == "invalid":
            from mcp.types import McpError, ErrorCode
            raise McpError(
                code=ErrorCode.INVALID_PARAMS,
                message=f"Location '{query.location}' not found in weather database",
            )
        
        current = {
            "location": query.location,
            "temperature": 22.5,
            "units": query.units,
            "conditions": "Partly cloudy",
            "humidity": 65,
        }
        
        forecast = [
            {"day": i + 1, "high": 24 + i, "low": 18 - i}
            for i in range(query.forecast_days)
        ]
        
        return {
            "current": current,
            "forecast": forecast,
        }
    
    except Exception as e:
        # Convert any internal error to McpError
        from mcp.types import McpError, ErrorCode
        raise McpError(
            code=ErrorCode.INTERNAL_ERROR,
            message=f"Weather service error: {str(e)}",
        )

if __name__ == "__main__":
    mcp.run()
```

**Key Points:**
- Pydantic `Field()` provides automatic validation and documentation
- `min_length`, `max_length`, `ge`, `le`, `pattern` enforce constraints
- Type hints (`location: str`, `forecast_days: int`) are required
- Docstrings appear in LLM client UIs
- Errors are structured as `McpError` with proper error codes

---

### Pattern 2: Resource Management (Static + Dynamic URIs)

**Problem:** Resources (read-only data) need both static lookup and dynamic generation.

**Solution:** Use `@mcp.resource()` decorator for static URIs and `@mcp.resource_list()` for discovering available resources.

```python
from fastmcp import FastMCP
from mcp.types import McpError, ErrorCode
from pydantic import BaseModel, Field
from typing import Optional
import json

mcp = FastMCP(name="config-manager", version="1.0.0")

# Static configuration resources
CONFIG_STORE = {
    "app:production": {"database": "prod-db.example.com", "log_level": "INFO"},
    "app:staging": {"database": "staging-db.example.com", "log_level": "DEBUG"},
    "app:development": {"database": "localhost", "log_level": "TRACE"},
}

@mcp.resource(uri_template="config://app/{env}")
def get_app_config(env: str) -> str:
    """Retrieve application configuration for an environment.
    
    URI format: config://app/{env}
    Example: config://app/production
    """
    if env not in CONFIG_STORE:
        raise McpError(
            code=ErrorCode.RESOURCE_NOT_FOUND,
            message=f"Environment '{env}' not found. Available: {', '.join(CONFIG_STORE.keys())}",
        )
    return json.dumps(CONFIG_STORE[env], indent=2)

@mcp.resource_list()
async def list_configs() -> list[dict]:
    """List all available configuration resources."""
    return [
        {
            "uri": f"config://app/{env}",
            "name": f"Config for {env}",
            "mimeType": "application/json",
        }
        for env in CONFIG_STORE.keys()
    ]

# Dynamic resource generation
@mcp.resource(uri_template="stats://process/{pid}")
def get_process_stats(pid: str) -> str:
    """Get runtime statistics for a process.
    
    URI format: stats://process/{pid}
    Example: stats://process/12345
    """
    try:
        pid_int = int(pid)
    except ValueError:
        raise McpError(
            code=ErrorCode.INVALID_PARAMS,
            message=f"Invalid PID: '{pid}' must be a number",
        )
    
    # Simulate process stats lookup
    if pid_int < 1:
        raise McpError(
            code=ErrorCode.RESOURCE_NOT_FOUND,
            message=f"Process {pid_int} not running",
        )
    
    stats = {
        "pid": pid_int,
        "memory_mb": 128.5 + pid_int,
        "cpu_percent": 25.3,
        "threads": 4,
    }
    return json.dumps(stats, indent=2)

if __name__ == "__main__":
    mcp.run()
```

**Key Points:**
- `uri_template` defines parameterized URIs (e.g., `config://app/{env}`)
- Parameters are extracted automatically and passed as function arguments
- `@mcp.resource_list()` returns discoverable resources for LLM clients
- Always return `str` (JSON-serializable) from resource handlers
- Use `McpError` for not-found or invalid resource cases

---

### Pattern 3: Complete Server (Tools + Resources + Prompts + Error Handling)

**Problem:** Real-world servers need tools, resources, prompts, and robust error handling all together.

**Solution:** Build a multi-capability server with all features integrated.

```python
from fastmcp import FastMCP
from mcp.types import McpError, ErrorCode
from pydantic import BaseModel, Field
from typing import Optional
import json
import logging
from datetime import datetime

# Configure logging (never print to stdout on stdio transport)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Initialize server
mcp = FastMCP(
    name="data-analysis-server",
    version="1.0.0",
)

# ============================================================================
# TOOLS
# ============================================================================

class DatasetQuery(BaseModel):
    """Query schema for dataset analysis."""
    dataset_id: str = Field(
        ...,
        description="Dataset identifier",
        min_length=1,
        max_length=50,
        pattern="^[a-zA-Z0-9_-]+$",
    )
    operation: str = Field(
        default="summary",
        description="Analysis operation: summary, schema, sample, stats",
        pattern="^(summary|schema|sample|stats)$",
    )
    limit: int = Field(
        default=10,
        description="Number of rows to return for sample operation",
        ge=1,
        le=1000,
    )

@mcp.tool()
def analyze_dataset(query: DatasetQuery) -> dict:
    """Analyze a dataset and return statistics or samples.
    
    Supports multiple analysis operations:
    - summary: Basic metadata about the dataset
    - schema: Column names and types
    - sample: First N rows of data
    - stats: Statistical summary of numeric columns
    """
    logger.info(f"Analyzing dataset: {query.dataset_id}, operation: {query.operation}")
    
    try:
        # Simulate dataset lookup
        datasets = {
            "sales-2024": {
                "rows": 50000,
                "columns": ["date", "product_id", "quantity", "price"],
                "types": ["timestamp", "string", "integer", "float"],
            },
            "users-active": {
                "rows": 12500,
                "columns": ["user_id", "signup_date", "last_login", "country"],
                "types": ["string", "timestamp", "timestamp", "string"],
            },
        }
        
        if query.dataset_id not in datasets:
            logger.warning(f"Dataset not found: {query.dataset_id}")
            raise McpError(
                code=ErrorCode.RESOURCE_NOT_FOUND,
                message=f"Dataset '{query.dataset_id}' not found. Available: {', '.join(datasets.keys())}",
            )
        
        dataset_info = datasets[query.dataset_id]
        
        # Handle different operations
        if query.operation == "summary":
            result = {
                "dataset_id": query.dataset_id,
                "row_count": dataset_info["rows"],
                "column_count": len(dataset_info["columns"]),
                "columns": dataset_info["columns"],
            }
        elif query.operation == "schema":
            result = {
                "dataset_id": query.dataset_id,
                "schema": {
                    col: col_type
                    for col, col_type in zip(dataset_info["columns"], dataset_info["types"])
                },
            }
        elif query.operation == "sample":
            result = {
                "dataset_id": query.dataset_id,
                "sample_size": min(query.limit, dataset_info["rows"]),
                "data": [
                    {col: f"sample_value_{i}" for col in dataset_info["columns"]}
                    for i in range(min(query.limit, dataset_info["rows"]))
                ],
            }
        elif query.operation == "stats":
            result = {
                "dataset_id": query.dataset_id,
                "numeric_columns": ["quantity", "price"],
                "stats": {
                    "quantity": {"min": 1, "max": 100, "mean": 25.5},
                    "price": {"min": 10.0, "max": 1000.0, "mean": 250.75},
                },
            }
        else:
            raise McpError(
                code=ErrorCode.INVALID_PARAMS,
                message=f"Unknown operation: {query.operation}",
            )
        
        logger.info(f"Dataset analysis completed successfully: {query.dataset_id}")
        return result
    
    except McpError:
        # Re-raise already-structured MCP errors
        raise
    except Exception as e:
        logger.error(f"Unexpected error analyzing dataset: {str(e)}", exc_info=True)
        raise McpError(
            code=ErrorCode.INTERNAL_ERROR,
            message=f"Failed to analyze dataset: {str(e)}",
        )

# ============================================================================
# RESOURCES
# ============================================================================

DATASET_METADATA = {
    "sales-2024": {
        "created": "2024-01-01",
        "last_updated": "2024-12-31",
        "size_mb": 512,
        "owner": "analytics-team",
    },
    "users-active": {
        "created": "2024-06-15",
        "last_updated": "2024-12-31",
        "size_mb": 256,
        "owner": "user-team",
    },
}

@mcp.resource(uri_template="dataset://meta/{dataset_id}")
def get_dataset_metadata(dataset_id: str) -> str:
    """Retrieve metadata for a dataset.
    
    URI format: dataset://meta/{dataset_id}
    Example: dataset://meta/sales-2024
    """
    if dataset_id not in DATASET_METADATA:
        raise McpError(
            code=ErrorCode.RESOURCE_NOT_FOUND,
            message=f"Metadata for dataset '{dataset_id}' not found",
        )
    return json.dumps(DATASET_METADATA[dataset_id], indent=2)

@mcp.resource_list()
async def list_available_datasets() -> list[dict]:
    """List all available datasets and their metadata resources."""
    return [
        {
            "uri": f"dataset://meta/{dataset_id}",
            "name": f"Metadata for {dataset_id}",
            "mimeType": "application/json",
        }
        for dataset_id in DATASET_METADATA.keys()
    ]

# ============================================================================
# PROMPTS
# ============================================================================

class PromptInput(BaseModel):
    """Input schema for prompt templates."""
    dataset_id: str = Field(
        ...,
        description="Dataset to analyze",
    )

@mcp.prompt()
def generate_analysis_prompt(input: PromptInput) -> str:
    """Generate a prompt for analyzing a specific dataset.
    
    This prompt guides LLM clients on how to structure their analysis requests.
    """
    return f"""You are analyzing the dataset '{input.dataset_id}'. 

Available operations:
1. summary - Get basic metadata
2. schema - Get column names and types
3. sample - Get sample rows
4. stats - Get statistical summary

For example:
- To see what columns exist: analyze_dataset(dataset_id="{input.dataset_id}", operation="schema")
- To see sample data: analyze_dataset(dataset_id="{input.dataset_id}", operation="sample", limit=5)
- To get statistics: analyze_dataset(dataset_id="{input.dataset_id}", operation="stats")

Start with schema to understand the data structure."""

# ============================================================================
# SERVER ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    logger.info("Starting data-analysis-server")
    try:
        mcp.run()
    except KeyboardInterrupt:
        logger.info("Server shutting down")
    except Exception as e:
        logger.error(f"Server error: {str(e)}", exc_info=True)
        raise
```

**Key Points:**
- All three capabilities (tools, resources, prompts) in one server
- Logging to stderr (not stdout) on stdio transport
- Error handling with try/except and `McpError`
- Pydantic validation on all inputs
- Docstrings for discoverability
- Resource listing for dynamic discovery

---

### Pattern 4: BAD vs GOOD — Stdio Transport Mistake

**BAD: Using print() on stdio transport pollutes the MCP protocol channel**

```python
from fastmcp import FastMCP

mcp = FastMCP(name="bad-server")

@mcp.tool()
def process_data(data: str) -> str:
    """Process some data."""
    print(f"DEBUG: Received data: {data}")  # ❌ WRONG - pollutes stdout
    print(f"DEBUG: Processing started")     # ❌ WRONG - breaks MCP protocol
    result = data.upper()
    print(f"DEBUG: Result = {result}")      # ❌ WRONG - client will crash
    return result

if __name__ == "__main__":
    mcp.run()  # Stdio transport (default)
```

**Why this fails:**
- On stdio transport, stdout is the MCP protocol channel (JSON-RPC messages)
- `print()` statements pollute stdout with text that's not valid JSON
- Client receiving mixed protocol + debug output cannot parse responses
- MCP connection breaks and client crashes with cryptic parsing errors

**GOOD: Use logging module for debug output**

```python
from fastmcp import FastMCP
import logging

# Configure logging to stderr (safe on stdio transport)
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()],  # Writes to stderr by default
)
logger = logging.getLogger(__name__)

mcp = FastMCP(name="good-server")

@mcp.tool()
def process_data(data: str) -> str:
    """Process some data."""
    logger.debug(f"Received data: {data}")      # ✅ GOOD - goes to stderr
    logger.info("Processing started")           # ✅ GOOD - goes to stderr
    result = data.upper()
    logger.debug(f"Result = {result}")          # ✅ GOOD - goes to stderr
    return result

if __name__ == "__main__":
    logger.info("Starting good-server")
    mcp.run()  # Stdio transport safe now
```

**Why this works:**
- Logging module writes to stderr by default
- Stderr doesn't interfere with stdout (the MCP protocol channel)
- Client receives clean JSON-RPC messages on stdout
- Debug information remains visible in server logs on stderr
- MCP connection stays stable

---

## Constraints

### MUST DO

1. **Use Pydantic models for all tool inputs** — Every tool parameter must be a Pydantic `BaseModel` with type hints. FastMCP uses these for automatic validation and JSON schema generation.

2. **Define descriptive docstrings on every tool and resource** — These appear in LLM client UIs and help clients understand when to call each capability.

3. **Use `McpError` for structured error responses** — Catch exceptions and convert to `McpError` with proper error codes (`INVALID_PARAMS`, `RESOURCE_NOT_FOUND`, `INTERNAL_ERROR`). Never expose raw tracebacks to clients.

4. **Log to stderr, never print to stdout** — On stdio transport, stdout is the MCP protocol channel (JSON-RPC). Use Python `logging` module configured to write to stderr. `print()` breaks MCP protocol parsing.

5. **Set minimum and maximum constraints on numeric fields** — Use Pydantic `Field(ge=1, le=100)` to enforce valid ranges. This documents expectations and prevents invalid states.

6. **Include pattern validation for string fields when applicable** — Use regex patterns (e.g., `pattern="^[a-zA-Z0-9_-]+$"`) to validate format. This prevents injection attacks and malformed identifiers.

7. **Validate URI templates match the resource handler signature** — If URI template is `config://app/{env}`, the handler must have `env: str` parameter. Mismatch causes runtime errors.

8. **Test error paths explicitly** — Write tests that trigger each error condition and verify the correct `McpError` is raised with diagnostic message.

9. **Initialize FastMCP with unique server name and version** — `FastMCP(name="my-server", version="1.0.0")` enables proper identification in client logs and allows version upgrades.

10. **Document resource MIME types correctly** — Use `mimeType: "application/json"` for JSON resources, `text/plain` for text. Clients use this for rendering and caching.

### MUST NOT DO

1. **Never use bare `raise Exception()`** — Always convert to `McpError` with structured error code and diagnostic message. Bare exceptions expose internal stack traces.

2. **Never use `print()` for debugging on stdio transport** — This pollutes the JSON-RPC protocol channel. Use `logging` module instead.

3. **Never expose internal implementation details in error messages** — Error messages should be diagnostic for the client, not raw stack traces. For example: "Invalid location" instead of "KeyError: 'San Francisco' in line 42 of weather.py".

4. **Never make tool parameters optional without default values** — Tools should have clear required vs optional inputs. If optional, provide a sensible default.

5. **Never skip field validation in Pydantic models** — Always include `min_length`, `max_length`, `pattern`, `ge`, `le`, or `regex` constraints. Unvalidated input is a security risk and source of runtime errors.

6. **Never return raw Python objects from tools** — Always convert to JSON-serializable types (dict, list, str). FastMCP serializes tool outputs, and custom objects will fail.

7. **Never register two tools with the same name** — Tool names must be unique. Duplicates silently override earlier registrations, causing unexpected behavior.

8. **Never implement blocking I/O in tool handlers** — Tools should be fast (<100ms). For long operations, return a job ID and use separate polling tool. Slow tools timeout and block the entire server.

9. **Never ignore transport type when choosing stdio vs HTTP** — Stdio is for local CLI integration (no network overhead). HTTP/Streamable is for remote clients. Mixing them causes protocol mismatches.

10. **Never commit hardcoded secrets in tool implementations** — Use environment variables or secure configuration. Tools may be called by untrusted clients who can read return values.

---

## Transport Selection Guide

### Stdio Transport (Default)

**Use stdio when:**
- Server is integrated with local LLM CLI tools (e.g., Claude Desktop)
- No remote network access needed
- Simplicity is priority over scalability

**Configuration:**
```python
from fastmcp import FastMCP

# Stdio is the default
mcp = FastMCP(name="my-server")
mcp.run()  # Uses stdio transport automatically
```

**Advantages:**
- Zero network configuration
- Low latency (local process communication)
- No firewall or auth needed
- Simple debugging (stderr logs visible in terminal)

**Constraints:**
- Cannot serve multiple clients simultaneously (one connection per process)
- No HTTP for REST-style clients
- Stdout must be kept clean for MCP protocol (use logging to stderr)

---

### HTTP/Streamable Transport

**Use HTTP when:**
- Server needs to serve multiple remote clients
- Exposing server over network (with proper authentication)
- Integrating with web-based LLM platforms
- Building scalable service architecture

**Configuration:**
```python
from fastmcp import FastMCP
from fastmcp.transport import HTTPServerTransport

mcp = FastMCP(name="my-server")

# Use HTTP transport
transport = HTTPServerTransport(host="0.0.0.0", port=8000)
mcp.run(transport)
```

**Advantages:**
- Multiple concurrent clients
- Network-accessible (with proper auth)
- Standard HTTP tooling and monitoring
- Scalable with reverse proxies

**Constraints:**
- Need HTTPS + authentication for security
- Network latency overhead
- Firewall/port configuration required
- More complex deployment

---

## Error Handling Patterns

### McpError with Proper Error Codes

```python
from mcp.types import McpError, ErrorCode

# Invalid user input
raise McpError(
    code=ErrorCode.INVALID_PARAMS,
    message="forecast_days must be between 1 and 14",
)

# Resource not found
raise McpError(
    code=ErrorCode.RESOURCE_NOT_FOUND,
    message="Dataset 'missing-dataset' does not exist",
)

# Server-side error
raise McpError(
    code=ErrorCode.INTERNAL_ERROR,
    message="Database connection failed: timeout after 30s",
)

# Request too complex
raise McpError(
    code=ErrorCode.RESOURCE_EXHAUSTED,
    message="Query would return 1M rows; limit is 100K",
)
```

### Structured Exception Handling

```python
@mcp.tool()
def risky_operation(params: MyParams) -> dict:
    """Perform operation that may fail."""
    try:
        # Attempt operation
        result = do_work(params)
        return result
    
    except ValueError as e:
        # Expected validation error
        logger.warning(f"Validation failed: {str(e)}")
        raise McpError(
            code=ErrorCode.INVALID_PARAMS,
            message=f"Invalid input: {str(e)}",
        )
    
    except TimeoutError as e:
        # Expected timeout
        logger.error(f"Operation timed out: {str(e)}")
        raise McpError(
            code=ErrorCode.RESOURCE_EXHAUSTED,
            message="Operation took too long; please try with smaller input",
        )
    
    except Exception as e:
        # Unexpected error
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        raise McpError(
            code=ErrorCode.INTERNAL_ERROR,
            message=f"Internal server error: {e.__class__.__name__}",
        )
```

---

## Output Template

When this skill is active, your output must contain:

1. **Complete Function Signatures** — Every tool/resource handler must have full type hints and Pydantic models. Show input validation constraints clearly.

2. **Server Initialization** — FastMCP instance creation with name and version, transport selection, and configuration.

3. **Error Handling** — Try/except blocks converting all exceptions to `McpError` with diagnostic messages. Include logging statements to stderr.

4. **Pydantic Validation** — Input models with Field() constraints (min/max, pattern, regex). Never skip validation.

5. **Docstrings** — Every function must have a docstring describing what it does, what inputs it accepts, what it returns, and what errors it may raise.

6. **Decorator Usage** — Correct FastMCP decorators: `@mcp.tool()`, `@mcp.resource()`, `@mcp.resource_list()`, `@mcp.prompt()`.

7. **Transport Selection** — Explicit transport choice (stdio for local, HTTP for remote) with configuration shown.

8. **Resource URIs** — Properly formatted URI templates with examples. Handler functions must accept all template parameters.

9. **Logging Configuration** — Logging module setup with stderr output, not stdout. Show log level and format.

10. **Entry Point** — `if __name__ == "__main__":` block with `mcp.run()` call and error handling.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `ai-llm-agentic-tooling-mcp` | MCP protocol fundamentals, server/client architecture, security, and best practices |
| `mcp-tool-design-patterns` | Designing effective tool interfaces and signatures for LLM use |
| `mcp-security-authorization` | Authentication, authorization, and secure MCP deployments |

