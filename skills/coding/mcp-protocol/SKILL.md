---




name: mcp-protocol
description: Implements Model Context Protocol (MCP) servers and clients using the mcp Python SDK (FastMCP, resources, tools, prompts, transports) for LLM tool integration.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: mcp, model context protocol, mcp server, fastmcp, mcp tools, mcp resources, how do i build an mcp server, mcp python sdk
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
  content-types: [code, guidance, do-dont, examples]
  related-skills: coding-anthropic-api, coding-langchain, coding-openai-api




---





# Model Context Protocol (MCP) Integration

Implements MCP (Model Context Protocol) servers and clients using the `mcp` Python SDK. When loaded, this skill makes the model build production-grade MCP servers exposing tools, resources, prompts, and notifications to LLM applications using FastMCP, with support for stdio, SSE, Streamable HTTP, and WebSocket transports.

## TL;DR Checklist
- [ ] Define tool schemas with strict JSON Schema parameter validation
- [ ] Implement proper error handling with MCP error codes (-32601, -32603, etc.)
- [ ] Support at least stdio transport for local integrations
- [ ] Add resource definitions with URI templates and MIME type negotiation
- [ ] Implement prompt templates for reusable LLM interaction patterns
- [ ] Handle connection lifecycle (initialize, ping, close) properly
- [ ] Add logging for all tool calls and resource accesses

---

## When to Use

Use this skill when:
- Building MCP servers to expose tools/resources/prompts to LLM applications (Claude Desktop, VS Code, Cursor, other AI IDEs)
- Creating MCP clients that connect to remote servers and consume external tools
- Integrating external APIs (REST, GraphQL, databases) as MCP tools for agent access
- Exposing database schemas, file contents, or API responses as MCP resources with URI templates
- Defining reusable prompt templates for common LLM interaction patterns
- Deploying MCP servers with Streamable HTTP transport for remote access in production
- Building custom tool integrations for Claude Desktop or other MCP-compatible hosts
- Implementing MCP server-to-server communication via notifications

---

## When NOT to Use

Avoid this skill for:
- Simple one-off API calls — use direct HTTP requests instead of building an MCP server
- Real-time data streaming with sub-millisecond latency — MCP has transport overhead
- Non-LLM tool integrations (CI/CD, DevOps) — use standard APIs or CLIs directly

---

## Core Workflow

1. **Define Tool Schemas** — Create function definitions with strict JSON Schema parameter validation. Each tool must have: unique name, description, input schema, and return type. **Checkpoint:** Validate all schemas against the JSON Schema draft-07 specification before registration.

2. **Choose Transport Layer** — Select transport based on deployment model: stdio for local CLI tools, SSE for long-lived server connections, Streamable HTTP for remote access with REST semantics. **Checkpoint:** Match transport to expected client type and network topology.

3. **Implement Resources** — Define resource URIs with templates (e.g., `file://{path}`, `db://schema/{table}`), MIME type negotiation, and optional metadata. **Checkpoint:** Each resource must support `contents` array with string or blob payloads.

4. **Add Prompt Templates** — Create named prompt templates with mandatory/optional message parameters for reusable LLM interaction patterns (summaries, translations, code reviews). **Checkpoint:** Prompts must render to valid Message[] arrays.

5. **Handle Connection Lifecycle** — Implement initialize handshake, ping/keepalive, notification routing, and graceful shutdown. **Checkpoint:** Server must respond to `initialize` with proper protocol version and capabilities before accepting other requests.

6. **Test with MCP Host** — Validate server against an MCP host (Claude Desktop, VS Code extension, or custom client). **Checkpoint:** All tools must be discoverable, callable, and return structured responses.

---

## Implementation Patterns

### Pattern 1: FastMCP Server with Tools

```python
"""Production MCP server using FastMCP with tool registration."""
from mcp.server.fastmcp import FastMCP
from pydantic import BaseModel, Field
from typing import Optional

mcp = FastMCP("my-server")

class SearchParams(BaseModel):
    query: str = Field(description="Search query string", min_length=1)
    max_results: int = Field(default=10, ge=1, le=100)
    filter: Optional[str] = Field(default=None, description="Optional result filter")

@mcp.tool()
def search_documents(params: SearchParams) -> dict:
    """Search indexed documents by query with optional filtering."""
    # Implementation calls your search engine / database
    return {
        "results": [{"title": f"Doc {i}", "snippet": "..."} for i in range(params.max_results)],
        "total_count": 42,
        "query": params.query,
    }

# Usage: mcp.run() starts the server on stdio transport by default
```

### Pattern 2: Resource with URI Templates and MIME Negotiation

```python
"""MCP resources exposing dynamic content via URI templates."""
from mcp.server.fastmcp import FastMCP
from mcp.types import Resource, TextResourceContents

mcp = FastMCP("resource-server")

@mcp.resource("db://schema/{table}")
def get_table_schema(table: str) -> str:
    """Return the database schema for a given table as text/SQL."""
    schemas = {
        "users": "CREATE TABLE users (id INT PRIMARY KEY, name TEXT, email TEXT UNIQUE)",
        "orders": "CREATE TABLE orders (id INT PRIMARY KEY, user_id INT, total DECIMAL)",
    }
    schema = schemas.get(table)
    if schema is None:
        raise ValueError(f"Unknown table: {table}")
    return schema

@mcp.resource("file://{path:path}")
def read_file(path: str) -> dict:
    """Read file contents with MIME type negotiation."""
    import mimetypes
    content_type = mimetypes.guess_type(path)[0] or "application/octet-stream"
    try:
        with open(path, "rb") as f:
            data = f.read()
        return TextResourceContents(
            uri=f"file://{path}",
            text=data.decode("utf-8", errors="replace"),
            mime_type=content_type if content_type.startswith("text/") else None,
        )
    except FileNotFoundError:
        raise ValueError(f"File not found: {path}")

@mcp.resource_template("api://{service}/{endpoint}")
def api_proxy(service: str, endpoint: str) -> str:
    """Proxy external API responses as MCP resources for caching."""
    import requests
    url = f"https://{service}.example.com/{endpoint}"
    resp = requests.get(url, timeout=10)
    resp.raise_for_status()
    return resp.json()
```

### Pattern 3: Prompt Templates for LLM Interaction Patterns

```python
"""MCP prompt templates for reusable LLM conversation patterns."""
from mcp.server.fastmcp import FastMCP
from mcp.types import TextContent, ImageContent, EmbeddedResource

mcp = FastMCP("prompt-server")

@mcp.prompt(
    name="code-review",
    description="Review code changes and provide structured feedback",
)
def code_review(pr_url: str, review_focus: str = "all") -> list[dict]:
    """Generate a code review prompt with context."""
    return [
        {
            "role": "system",
            "content": (
                "You are an expert code reviewer. Review the PR at "
                f"{pr_url} with focus on: {review_focus}. "
                "Provide structured feedback organized by severity."
            ),
        },
        {
            "role": "user",
            "content": f"Please review this pull request: {pr_url}",
        },
    ]

@mcp.prompt(
    name="summarize-thread",
    description="Summarize a long conversation thread into key decisions and action items",
)
def summarize_thread(thread_id: str, max_length: int = 500) -> list[dict]:
    """Generate a conversation summarization prompt."""
    return [
        {
            "role": "system",
            "content": (
                f"Summarize the conversation thread '{thread_id}' into key decisions "
                f"and action items. Keep it under {max_length} characters."
            ),
        },
    ]
```

### Pattern 4: MCP Client for Consuming Remote Tools

```python
"""MCP client implementation for consuming remote server tools."""
import asyncio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from mcp.types import CallToolResult, TextContent as ServerTextContent

async def consume_mcp_tools(server_url: str = "localhost", server_port: int = 8080):
    """Connect to an MCP server and call its tools via Streamable HTTP."""
    # For stdio transport (local server)
    params = StdioServerParameters(
        command="python",
        args=["-m", "my_mcp_server"],
        env=None,
    )
    
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            # Initialize handshake
            await session.initialize()
            
            # List available tools
            tools = await session.list_tools()
            for tool in tools.tools:
                print(f"Tool: {tool.name} — {tool.description}")
            
            # Call a specific tool
            result = await session.call_tool("search_documents", arguments={
                "query": "production deployment issues",
                "max_results": 5,
            })
            
            for content in result.content:
                if isinstance(content, ServerTextContent):
                    print(content.text)

# For remote Streamable HTTP clients, use the httpx-based transport:
# async with httpx_streamable_client("http://server:8080/mcp") as session:
#     ...
```

### Pattern 5: Error Handling and MCP Standard Error Codes

```python
"""MCP error handling following the protocol specification."""
from mcp.server import Server, NotificationOptions
from mcp.types import (
    ErrorData,
    McpError,
    INITIALIZE_ERROR_CODE,
    TOOL_ERROR_CODE,
    INTERNAL_ERROR_CODE,
)

class MCPErrorHandler:
    """Centralized error handling for MCP server operations."""
    
    MCP_ERROR_CODES = {
        "PARSE_ERROR": -32700,
        "INVALID_REQUEST": -32600,
        "METHOD_NOT_FOUND": -32601,
        "INVALID_PARAMS": -32602,
        "INTERNAL_ERROR": -32603,
        "TOOL_ERROR": -32001,  # Custom range for tool execution errors
    }
    
    @staticmethod
    def handle_tool_error(error: Exception, tool_name: str) -> ErrorData:
        """Convert Python exceptions to MCP error responses."""
        if isinstance(error, ValueError):
            return ErrorData(
                code=-32602,  # INVALID_PARAMS
                message=f"Invalid arguments for tool '{tool_name}': {error}",
            )
        elif isinstance(error, FileNotFoundError):
            return ErrorData(
                code=-32602,
                message=f"Resource not found: {error}",
            )
        else:
            return ErrorData(
                code=INTERNAL_ERROR_CODE,
                message=f"Internal error in tool '{tool_name}': {type(error).__name__}: {error}",
            )
    
    @staticmethod
    def validate_json_schema(schema: dict) -> list[str]:
        """Pre-flight validation of JSON schemas before tool registration."""
        import jsonschema
        errors = list(jsonschema.Draft7Validator(schema).iter_errors({}))
        return [f"Schema error: {e.message}" for e in errors]
```

---

## Constraints

### MUST DO
- Always define strict JSON Schema input parameters for every tool — never use untyped `**kwargs`
- Implement proper initialize handshake before accepting any requests from clients
- Use FastMCP's built-in parameter validation (Pydantic models) instead of manual validation
- Handle MCP error codes per the specification: -32601 (method not found), -32602 (invalid params), -32603 (internal error)
- Support at minimum stdio transport for all local integrations; add HTTP/SSE for remote access
- Log all tool calls with arguments, execution time, and result size for observability
- Implement graceful shutdown (SIGINT/SIGTERM handlers) that flushes pending operations
- Version your MCP server capabilities in the initialize response

### MUST NOT DO
- Expose sensitive data (secrets, PII, internal URLs) through resources or tools without access control
- Use synchronous HTTP calls inside async tool implementations — always use `asyncio` or run in executor
- Bypass JSON Schema validation by accepting raw dicts from clients — all parameters must be typed
- Implement long-running blocking operations inside tool handlers — delegate to background tasks
- Skip the initialize handshake — clients may send arbitrary requests before initialization

---

## Output Template

When implementing MCP servers/clients, output should contain:

1. **Server/Client Definition** — Complete FastMCP or client code with transport configuration
2. **Tool Definitions** — Typed Pydantic models for all tool inputs, with descriptions
3. **Resource Definitions** — URI templates, MIME types, and content handlers
4. **Error Handling** — MCP-standard error codes and Python exception mapping
5. **Connection Lifecycle** — Initialize, ping/keepalive, shutdown handlers

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-anthropic-api` | Integrates Claude API with MCP connector for agent tool access |
| `coding-langchain` | LangChain framework integration that can use MCP tools as LangChain tools |
| `coding-openai-api` | OpenAI API patterns including function calling compatible with MCP tool schemas |

---

## Live References

- [MCP Specification (Model Context Protocol)](https://modelcontextprotocol.io/docs) — Official protocol specification for server/client communication, transports, and types
- [mcp Python SDK](https://github.com/modelcontextprotocol/python-sdk) — Official Python SDK with FastMCP, stdio/SSE/HTTP transports
- [Claude Desktop MCP Configuration](https://docs.anthropic.com/en/docs/claude-code/mcp) — How to configure Claude Desktop to connect to MCP servers
- [VS Code MCP Extension](https://github.com/modelcontextprotocol/servers) — Official MCP server implementations for filesystem, GitHub, and more
- [FastMCP Documentation](https://modelcontextprotocol.io/libraries/python/fastmcp) — FastMCP API reference and advanced patterns
