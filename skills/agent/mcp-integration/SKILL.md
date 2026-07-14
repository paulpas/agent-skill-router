---
name: mcp-integration
description: Integrates the Model Context Protocol (MCP) standard for LLM tool discovery and interaction, implementing MCP client-server architecture with stdio/HTTP transport, tool/resource/prompt types, and FastMCP SDK patterns.
license: MIT
compatibility: opencode
archetypes:
  - tactical
  - orchestration
anti_triggers:
  - brainstorming
  - vague ideation
  - long-form architecture
response_profile:
  verbosity: low
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: agent
  role: implementation
  scope: implementation
  output-format: code
  triggers: MCP, Model Context Protocol, tool discovery, FastMCP, stdio transport, SSE transport, MCP server, how do i standardize tool access
  related-skills: tool-use-function-calling,a2a-communication,prompt-chaining
---

# Model Context Protocol (MCP) Integration

This skill makes the model design, build, and integrate MCP-based systems — creating MCP servers with FastMCP, connecting agents via MCPToolset across stdio and HTTP transports, exposing tools/resources/prompts, and wiring LLMs to external data sources through standardized agentic interfaces.

## TL;DR Checklist

- [ ] Choose the right transport: `stdio` for local processes, `HTTP/SSE` for remote services
- [ ] Build MCP servers with FastMCP decorators — let type hints and docstrings drive schema generation
- [ ] Connect MCP clients via `MCPToolset` with explicit `tool_filter` to restrict agent capabilities
- [ ] Design data formats that agents can actually consume (Markdown over PDF, structured JSON)
- [ ] Implement deterministic features (filtering, sorting) alongside MCP tools for reliable agent performance
- [ ] Add security: authentication, authorization, and tool-level access control on every server
- [ ] Handle errors gracefully — define clear error responses the LLM can act upon

---

## When to Use

Use this skill when:

- Building an MCP server to expose internal APIs, databases, or services to LLM agents in a standardized format
- Connecting an existing agent framework (Google ADK, Claude Desktop, custom client) to one or more MCP servers
- Designing a federated tool ecosystem where multiple independent tools are discoverable by any compliant LLM
- Migrating ad-hoc tool function calling to a reusable, interoperable MCP architecture
- Composing multi-step agentic workflows that require the agent to discover and chain several external tools dynamically
- Standardizing how different LLM providers (Gemini, Claude, GPT) interact with the same set of external resources

---

## When NOT to Use

Avoid this skill for:

- Simple applications with a fixed, small set of pre-defined functions — direct tool function calling is sufficient and simpler (see `tool-use-function-calling`)
- Cases where you only need one-way data retrieval without agent decision-making — a regular REST API endpoint works better
- Scenarios demanding ultra-low-latency sub-millisecond tool calls — the MCP handshake adds network/IPC overhead that may not be acceptable
- Environments with no ability to run a local server process or manage subprocesses (stdio transport requires an executable)
- Situations where you cannot guarantee the external API's data format is agent-friendly (e.g., binary-only outputs like PDFs without prior text extraction)

---

## Core Workflow

1. **Assess Integration Needs** — Determine whether you need to build an MCP server (expose capabilities), consume an existing one (agent client), or both. Identify the external systems: databases, APIs, file stores, media services. Decide on transport based on deployment model: `stdio` for local co-located processes, `HTTP/SSE` for remote or cross-machine services. **Checkpoint:** Verify you have a clear inventory of tools/resources/prompts to expose and confirm the transport choice with deployment constraints.

2. **Design Agent-Friendly APIs** — Before wrapping anything in MCP, ensure the underlying API returns formats agents can actually consume: structured JSON, Markdown text, or URL references. Avoid raw binaries (PDFs, images without OCR) as direct MCP outputs. Add deterministic filtering and sorting to enable non-deterministic agents to work efficiently at scale. **Checkpoint:** Confirm every tool's input parameters are explicit in a schema and every output is parseable by an LLM without additional conversion.

3. **Implement the MCP Server with FastMCP** — Create the server using the `FastMCP` Python SDK. Use decorators (`@mcp.tool`, `@mcp.resource`, `@mcp.prompt`) to register capabilities. Rely on automatic schema generation from function signatures, type hints, and docstrings. Add authentication/authorization guards around tool handlers. **Checkpoint:** Run the server locally and verify it enumerates all registered tools/resources via a test MCP client connection with no errors.

4. **Configure the MCP Client (Agent Integration)** — Set up the agent's `MCPToolset` with the appropriate transport parameters. For stdio: provide `command`, `args`, and optional `env`. For HTTP: provide the server `url`. Always apply a `tool_filter` to restrict which tools the agent can invoke. **Checkpoint:** Confirm the agent discovers all intended tools, is blocked from unlisted tools by the filter, and can successfully execute one end-to-end tool call.

5. **Implement Error Handling and Resilience** — Define structured error responses that include error codes, human-readable messages, and actionable recovery suggestions. Implement server-side retry logic for transient failures (network timeouts, database connection pool exhaustion). Add client-side timeout configuration to prevent infinite waits. **Checkpoint:** Simulate failure conditions (server down, invalid tool parameters, permission denied) and verify the LLM receives clear, structured error information it can act upon.

6. **Validate End-to-End Agentic Workflow** — Test with a real LLM agent sending natural language requests through the MCP client to the server, executing tools, processing responses, and chaining multiple tool calls in sequence. Verify deterministic features (filtering/sorting) improve agent accuracy under volume. **Checkpoint:** The full workflow executes successfully across at least three distinct tool invocations with varied input parameters, producing correct and timely results.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Building an MCP Server with FastMCP (stdio transport)

Use FastMCP to expose Python functions as MCP tools. The SDK auto-generates the JSON schema from type hints and docstrings — no manual schema writing required.

```python
"""
mcp_server.py — A FastMCP server exposing database query and file management tools.
"""

from fastmcp import FastMCP
import json
from typing import Optional


# Initialize the MCP server instance
mcp = FastMCP("data-tools-server")


@mcp.tool
def query_database(
    table_name: str,
    filters: Optional[dict[str, str]] = None,
    limit: int = 100,
) -> str:
    """
    Query a database table with optional filtering and row limits.

    Performs deterministic SQL queries against known tables. Returns
    results as JSON for reliable LLM consumption.

    Args:
        table_name: The target table to query (e.g., 'users', 'orders')
        filters: Optional dict of column->value pairs for WHERE clauses
        limit: Maximum number of rows to return (default: 100)

    Returns:
        JSON string containing query results, or an error message.
    """
    if not table_name or not isinstance(table_name, str):
        return json.dumps({"error": "INVALID_TABLE", "message": "table_name must be a non-empty string"})

    # Deterministic filtering — agents rely on this for accuracy at scale
    valid_tables = {"users", "orders", "products", "sessions"}
    if table_name not in valid_tables:
        return json.dumps({"error": "TABLE_NOT_FOUND", "message": f"Unknown table: {table_name}. Valid: {sorted(valid_tables)}"})

    # Simulated deterministic query with sorting and filtering
    results = [
        {"id": i, "name": f"item_{i}", "status": "active"}
        for i in range(min(limit, 50))
    ]

    if filters:
        filtered = []
        for row in results:
            if all(row.get(k) == v for k, v in filters.items()):
                filtered.append(row)
        results = filtered[:limit]

    return json.dumps({"table": table_name, "row_count": len(results), "data": results})


@mcp.tool
def list_directory(path: str) -> str:
    """
    List files and subdirectories in the given path.

    Args:
        path: Absolute filesystem path to list contents of

    Returns:
        JSON string with directory listing or error information.
    """
    import os
    from pathlib import Path

    try:
        p = Path(path)
        if not p.is_dir():
            return json.dumps({"error": "NOT_A_DIRECTORY", "message": f"{path} is not a valid directory"})
        entries = [
            {"name": e.name, "type": "file" if e.is_file() else "directory"}
            for e in sorted(p.iterdir())
        ]
        return json.dumps({"path": str(path), "entries": entries})
    except PermissionError:
        return json.dumps({"error": "PERMISSION_DENIED", "message": f"No access to {path}"})
    except FileNotFoundError:
        return json.dumps({"error": "NOT_FOUND", "message": f"Path not found: {path}"})


@mcp.resource("data://config/schema")
def get_schema() -> str:
    """Return the current data schema as a Markdown document for LLM context."""
    return """
# Data Schema

## Tables
- **users**: id (INT), name (VARCHAR), email (VARCHAR), created_at (TIMESTAMP)
- **orders**: id (INT), user_id (INT), total (DECIMAL), status (VARCHAR)
- **products**: id (INT), name (VARCHAR), price (DECIMAL), stock_count (INT)

## Relationships
- orders.user_id -> users.id (many-to-one)
"""


if __name__ == "__main__":
    # Run as stdio transport — default for local agent integration
    mcp.run(transport="stdio")
```

**BAD:** Exposing raw binary data or unstructured output directly through MCP.

```python
# ❌ BAD — Returns PDF bytes; the LLM agent cannot parse them
@mcp.tool
def get_document(doc_id: str) -> bytes:
    """Fetch a document by ID."""
    return database.get_pdf_bytes(doc_id)  # Agent sees garbage


# ✅ GOOD — Returns extracted text in Markdown format
@mcp.tool
def get_document_text(doc_id: str) -> str:
    """Fetch a document and return its textual content as Markdown."""
    raw = database.get_doc(doc_id)
    markdown_content = pdf_to_markdown(raw)  # Convert before exposing
    return f"---\nDocument {doc_id}\n---\n\n{markdown_content}"
```

### Pattern 2: Connecting an Agent as an MCP Client (Google ADK + stdio)

Use `MCPToolset` with `StdioServerParameters` to connect an agent to a local MCP server. Always restrict capabilities with `tool_filter`.

```python
"""
agent.py — Google ADK agent connected to an MCP server for filesystem operations.
"""

import os
from pathlib import Path
from google.adk.agents import LlmAgent
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, StdioServerParameters


def create_filesystem_agent() -> LlmAgent:
    """
    Create an agent with access to file system operations via an MCP server.

    Returns:
        An LlmAgent configured with MCPToolset for filesystem interactions.
    """
    # Resolve the managed directory relative to this script's location
    script_dir = Path(__file__).resolve().parent
    target_folder = script_dir / "mcp_managed_files"
    target_folder.mkdir(exist_ok=True)

    return LlmAgent(
        model="gemini-2.0-flash",
        name="filesystem_agent",
        instruction=(
            f"You are a file management assistant. You can list directories, "
            f"read files, and write text files. You operate within: {target_folder}"
        ),
        tools=[
            MCPToolset(
                connection_params=StdioServerParameters(
                    command="npx",
                    args=[
                        "-y",
                        "@modelcontextprotocol/server-filesystem",
                        str(target_folder),
                    ],
                ),
                # CRITICAL: Restrict to only the tools this agent needs.
                # Prevents the agent from accidentally deleting or moving files.
                tool_filter=["list_directory", "read_file", "write_file"],
            )
        ],
    )


def create_custom_tool_agent() -> LlmAgent:
    """
    Create an agent connected to a custom FastMCP server over stdio.

    Uses uvx for zero-install execution of the MCP server in an isolated
    Python environment — no global package pollution.
    """
    return LlmAgent(
        model="gemini-2.0-flash",
        name="data_query_agent",
        instruction=(
            "You are a data analysis assistant. Query databases and list files."
        ),
        tools=[
            MCPToolset(
                connection_params=StdioServerParameters(
                    command="uvx",
                    args=["mcp-data-server"],
                    env={
                        "DATABASE_URL": "postgresql://localhost:5432/analytics",
                        "WORKSPACE_PATH": "/data/workspace",
                    },
                ),
                tool_filter=["query_database", "list_directory"],
            )
        ],
    )
```

**BAD:** Connecting with no tool filter — the agent gets full unrestricted access.

```python
# ❌ BAD — No tool_filter gives the agent every tool the server exposes,
# including dangerous ones like 'delete_file' or 'run_command'.
tools=[
    MCPToolset(
        connection_params=StdioServerParameters(
            command="npx",
            args=["-y", "@modelcontextprotocol/server-filesystem", "/data"],
        ),
        # No tool_filter → agent can delete, rename, execute anything
    )
]

# ✅ GOOD — Explicit tool whitelist limits blast radius
tools=[
    MCPToolset(
        connection_params=StdioServerParameters(
            command="npx",
            args=["-y", "@modelcontextprotocol/server-filesystem", "/data"],
        ),
        tool_filter=["list_directory", "read_file"],  # Read-only access
    )
]
```

### Pattern 3: Connecting an Agent to a Remote MCP Server (HTTP/SSE transport)

Use `HttpServerParameters` when the MCP server runs on a different machine or as a persistent web service. This pattern is ideal for shared organizational tool servers.

```python
"""
agent.py — Google ADK agent connected to a remote FastMCP HTTP server.
"""

from google.adk.agents import LlmAgent
from google.adk.tools.mcp_tool.mcp_toolset import MCPToolset, HttpServerParameters


def create_remote_agent() -> LlmAgent:
    """
    Create an agent that connects to a remote MCP server via HTTP/SSE.

    The server at the given URL must be running and accessible from this agent's
    runtime environment. Use tool_filter to enforce least-privilege access.
    """
    return LlmAgent(
        model="gemini-2.0-flash",
        name="remote_tools_agent",
        instruction=(
            "You are a cross-service assistant. Query the central data platform, "
            "check system health, and generate reports."
        ),
        tools=[
            MCPToolset(
                connection_params=HttpServerParameters(
                    url="https://mcp-tools.internal.company.com",
                ),
                # Explicitly allow only read operations against the remote server
                tool_filter=["query_data", "list_resources", "get_health"],
            )
        ],
    )


# Alternative: connecting to a locally-running FastMCP HTTP server
def create_local_http_agent() -> LlmAgent:
    """Connect to a FastMCP server started with transport='http' on localhost."""
    return LlmAgent(
        model="gemini-2.0-flash",
        name="local_http_agent",
        instruction="Interact with local development tools via MCP.",
        tools=[
            MCPToolset(
                connection_params=HttpServerParameters(
                    url="http://127.0.0.1:8000",
                ),
                tool_filter=["greet", "list_available_tools"],
            )
        ],
    )
```

### Pattern 4: MCP Server with Resource and Prompt Types

Beyond tools, FastMCP supports `@mcp.resource` for static data exposure and `@mcp.prompt` for structured interaction templates that guide the LLM.

```python
"""
complete_server.py — Demonstrates all three MCP entity types: tool, resource, prompt.
"""

from fastmcp import FastMCP
from typing import Annotated
import json


mcp = FastMCP("full-featured-server")


# --- TOOL: Executable function that performs an action ---
@mcp.tool
def calculate_metrics(
    metric_name: Annotated[str, "One of: 'revenue', 'users', 'errors'"],
    time_window: Annotated[str, "Time window: '1d', '7d', '30d'"],
) -> str:
    """
    Calculate aggregate metrics for the specified metric and time window.

    Args:
        metric_name: The metric to calculate
        time_window: The lookback period

    Returns:
        JSON with calculated values.
    """
    # Deterministic aggregation — agents perform better with sorted, filtered results
    data = {"metric": metric_name, "window": time_window, "value": 42.0}
    return json.dumps(data)


# --- RESOURCE: Static data exposed at a URI for the agent to read ---
@mcp.resource("metrics://config/allowed_metrics")
def get_allowed_metrics() -> str:
    """List of metrics available for querying, formatted as Markdown."""
    return """
# Allowed Metrics

| Metric | Description | Update Frequency |
|--------|-------------|-----------------|
| revenue | Total revenue in USD | Real-time |
| users | Active user count | 5-minute intervals |
| errors | Error rate (count per minute) | Real-time |

Only the metrics listed above can be queried via `calculate_metrics`.
"""


# --- PROMPT: Template that guides how the agent interacts with a tool ---
@mcp.prompt("generate_report")
def generate_report_prompt(
    report_type: str,
    audience: str = "engineering",
) -> list[dict[str, str]]:
    """
    Generate a structured prompt template for creating reports.

    The agent uses this to compose its first message when asked to write reports,
    ensuring consistent structure and appropriate detail level.

    Args:
        report_type: Type of report ('daily', 'weekly', 'incident')
        audience: Intended audience ('engineering', 'management', 'all-hands')
    """
    system_prompt = f"""You are generating a {report_type} report for {audience}.

Structure your report as follows:
1. Executive summary (3-5 bullet points)
2. Key metrics with trends compared to previous period
3. Notable events or anomalies
4. Action items and recommendations

Format all output in Markdown."""

    return [
        {"role": "system", "content": system_prompt},
        {
            "role": "user",
            "content": f"Generate a {report_type} report for the {audience}. Include the latest data from available tools.",
        },
    ]


if __name__ == "__main__":
    # Run as HTTP server for remote client access
    mcp.run(transport="http", host="127.0.0.1", port=8000)
```

---

## Constraints

### MUST DO

1. **Design agent-friendly data outputs** — Every tool and resource must return formats the LLM can consume directly (JSON, Markdown, plain text). Never expose raw binaries without prior extraction/conversion (`code-philosophy: Parse Don't Validate`).
2. **Use FastMCP decorators for schema generation** — Let `@mcp.tool`, `@mcp.resource`, and `@mcp.prompt` auto-generate JSON schemas from type hints and docstrings instead of manual schema definition (`code-philosophy: Atomic Predictability`).
3. **Apply tool_filter on every client connection** — Always restrict which tools the agent can invoke. Unfiltered access violates least-privilege principles and creates security vulnerabilities (`code-philosophy: Fail Fast` with explicit authorization boundaries).
4. **Implement deterministic features alongside MCP tools** — Add filtering, sorting, and pagination to underlying APIs so non-deterministic agents produce accurate results at scale (`code-philosophy: Early Exit` by rejecting invalid inputs upfront).
5. **Structure error responses for LLM consumption** — Every tool must return parseable error objects with error codes, human-readable messages, and actionable recovery suggestions. The LLM should be able to decide next steps from the error alone (`code-philosophy: Fail Fast`).
6. **Choose transport based on deployment model** — Use `stdio` when the server runs co-located with the agent process (same machine, local IPC). Use `HTTP/SSE` for remote or shared servers across machines or organizations (`code-philosophy: Intentional Naming` — your transport choice should match your architecture).
7. **Add authentication and authorization** — Every MCP server must enforce access control. Validate the client identity before executing any tool call, especially when tools interact with databases, files, or external APIs (`code-philosophy: Early Exit` by rejecting unauthorized requests at the boundary).
8. **Document every tool with type hints and docstrings** — The LLM discovers tool behavior from the auto-generated schema, which is derived entirely from Python signatures and documentation strings. Incomplete docs produce broken agent interactions (`code-philosophy: Intentional Naming`).

### MUST NOT DO

1. **Expose tools that wrap legacy APIs without adaptation** — Wrapping a poorly designed API directly in MCP propagates its flaws to every consuming agent. Improve the underlying API first with deterministic filtering, sorting, and structured outputs before exposing via MCP.
2. **Connect MCP servers without error handling** — Never leave tool handlers bare. Every handler must catch exceptions and return structured error responses the LLM can process. Silent failures leave the agent in an unknown state.
3. **Use stdio transport for remote cross-machine communication** — `StdioServerParameters` only works for local subprocess invocation. Using it for remote connections will fail. Always use `HttpServerParameters` for any server not running on the same machine as the client.
4. **Omit tool_filter when connecting agents to MCP servers** — Providing an unfiltered connection exposes every capability of the MCP server to the agent, creating a severe security risk. Every production connection must have an explicit allow-list.
5. **Mix transport configurations in the same MCPToolset** — Each `MCPToolset` instance must use exactly one transport type (stdio or HTTP). Mixing them requires separate `MCPToolset` instances with individual `connection_params`.
6. **Assume MCP enforces data format compatibility** — MCP is a transport and discovery protocol, not a data format validator. If your server exposes PDFs, images, or other agent-incompatible formats, the conversion layer must exist before MCP exposure.

---

## Output Template

When this skill is active, all generated code and documentation MUST include:

1. **Server/Client Architecture Diagram** — ASCII art showing client-server topology with transport type (stdio vs HTTP), tool/resource/prompt endpoints, and data flow direction.
2. **Tool Registration List** — Every `@mcp.tool` decorated function listed with its name, parameter signature, return type, and one-line purpose.
3. **Transport Configuration Block** — The exact `StdioServerParameters` or `HttpServerParameters` configuration being used, including all args and environment variables.
4. **Tool Filter Specification** — Explicit list of allowed tool names for the client connection, with justification for each inclusion.
5. **Error Response Schema** — The structured error format that tools return when failures occur, with at least three distinct error code examples.
6. **Deployment Instructions** — Step-by-step commands to start the MCP server and verify it is running (curl/stdout check), plus how to start the agent client and test a sample tool invocation.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `tool-use-function-calling` | For simple, direct LLM-to-tool calling without MCP's complexity — use when you don't need dynamic discovery or cross-LLM interoperability |
| `a2a-communication` | When agents need to communicate with each other rather than just consuming external tools via MCP |
| `prompt-chaining` | For composing multi-step prompt sequences that work alongside MCP tool calls in agentic workflows |
