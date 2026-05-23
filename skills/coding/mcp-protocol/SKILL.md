---
name: mcp-protocol
description: Implements Model Context Protocol (MCP) servers and clients using the mcp Python SDK (FastMCP, resources, tools, prompts, transports) for LLM tool integration.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: mcp, model context protocol, mcp server, fastmcp, mcp tools, mcp resources, how do i build an mcp server, mcp python sdk
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, examples, do-dont]
  related-skills: coding-anthropic-api, coding-langchain, coding-openai-api
---

# Model Context Protocol (MCP) Integration

Implements MCP (Model Context Protocol) servers and clients using the `mcp` Python SDK (v1.25+). When loaded, this skill makes the model build MCP servers that expose tools, resources, and prompts to LLM applications using FastMCP, with support for stdio, SSE, and Streamable HTTP transports.

## When to Use

Use this skill when:

- Building MCP servers that expose tools, resources, or prompts to LLM applications (Claude Desktop, VS Code, AI IDEs)
- Creating MCP clients that connect to remote servers and consume tools
- Integrating external APIs as MCP tools for agent access
- Exposing database schemas, file contents, or API responses as MCP resources
- Defining reusable prompt templates for LLM interaction patterns
- Deploying MCP servers with Streamable HTTP transport for remote access
- Building custom tool integrations for Claude Desktop or other MCP hosts

---

## When NOT to Use

- For using MCP tools via the Anthropic Claude MCP connector, use `coding-anthropic-api`
- For general API integration without MCP, use the relevant platform skill
- For building LangChain agents (which can consume MCP tools), use `coding-langchain`

---

## Core Workflow

1. **Initialize FastMCP Server** — Create a `FastMCP("server-name")` instance. FastMCP handles connection management, protocol compliance, capability negotiation, and message routing. **Checkpoint:** Run `mcp dev server.py` to test your server in development mode with the MCP inspector.

2. **Define Tools** — Use `@mcp.tool()` decorator on async functions. Tools let LLMs perform actions with side effects. Include typed parameters with docstrings — FastMCP parses these to generate the JSON schema automatically. Accept an optional `Context` parameter for capabilities like logging and progress reporting. **Checkpoint:** Test each tool with `mcp run server.py` and verify the JSON schema is generated correctly.

3. **Define Resources** — Use `@mcp.resource("uri://pattern/{param}")` decorator. Resources expose data to LLMs (like GET endpoints — no side effects). Use URI templates with path parameters. Resources support subscription for real-time updates via `resources/updated` notifications. **Checkpoint:** Verify resources/read returns the expected content for each URI pattern.

4. **Define Prompts** — Use `@mcp.prompt()` decorator to define reusable templates. Prompts are user-controlled interaction templates that return structured message arrays ready for LLM injection. **Checkpoint:** Test prompts with the MCP inspector to verify they produce well-formed message arrays.

5. **Choose a Transport** — For local development, use **stdio** transport (default). For remote deployment, use **Streamable HTTP** transport. Mount to an existing ASGI server using `mcp.sse_app()` for SSE or the StreamableHTTP adapter. **Checkpoint:** For remote servers, configure CORS properly and verify the OAuth flow if authentication is required.

---

## Implementation Patterns

### Pattern 1: Basic MCP Server with Tools

```python
# ❌ BAD — implements MCP protocol manually, no FastMCP, error-prone
import json, sys
def handle_message(msg):
    if msg["method"] == "tools/list":
        return {"result": {"tools": []}}
    # ... manual protocol handling

# ✅ GOOD — FastMCP handles protocol automatically
from mcp.server.fastmcp import FastMCP

# Create server — FastMCP manages all protocol details
mcp = FastMCP("DataService")


@mcp.tool()
async def get_repo_stats(owner: str, repo: str) -> str:
    """Fetch key statistics for a GitHub repository.

    Args:
        owner: GitHub username or organization name (e.g., 'microsoft').
        repo: Repository name (e.g., 'vscode').
    Returns:
        Formatted string with repo statistics.
    """
    import httpx

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}",
            headers={"Accept": "application/vnd.github.v3+json"},
        )
        response.raise_for_status()
        data = response.json()

    return (
        f"Repository: {data['full_name']}\n"
        f"Stars: {data['stargazers_count']:,}\n"
        f"Forks: {data['forks_count']:,}\n"
        f"Language: {data.get('language', 'N/A')}\n"
        f"Description: {data.get('description', 'No description')}"
    )


@mcp.tool()
async def search_web(query: str, max_results: int = 5) -> str:
    """Search the web for information.

    Args:
        query: The search query string.
        max_results: Maximum number of results (default 5, max 10).
    Returns:
        Formatted list of search results with titles and URLs.
    """
    # Implementation depends on search provider
    return f"Search results for: {query}"
```

### Pattern 2: Resources and Prompts

```python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("DocumentService")


@mcp.resource("docs://{category}/{doc_id}")
async def get_document(category: str, doc_id: str) -> str:
    """Expose documentation content as a resource.

    Args:
        category: Document category (e.g., 'api', 'guides').
        doc_id: Document identifier.
    Returns:
        The document content as plain text.
    """
    # Fetch document from a database or file system
    return f"Content of {category}/{doc_id}"


@mcp.resource("config://app")
async def get_config() -> str:
    """Expose application configuration as a resource.

    Returns:
        JSON-formatted configuration string.
    """
    import json

    config = {
        "version": "1.0.0",
        "environment": "production",
        "features": {"search": True, "export": False},
    }
    return json.dumps(config, indent=2)


@mcp.prompt()
def code_review_prompt(code: str, language: str = "python") -> str:
    """Generate a structured code review prompt.

    Args:
        code: The source code to review.
        language: Programming language of the code.
    Returns:
        A structured prompt template for code review.
    """
    return f"""You are a senior {language} developer conducting a code review.

Please review the following code for:

1. **Correctness**: Does the code do what it intends?
2. **Security**: Are there any vulnerabilities or unsafe patterns?
3. **Performance**: Are there any inefficiencies?
4. **Style**: Does it follow {language} best practices?

```{language}
{code}
```

Provide a severity rating for each issue found:
- **CRITICAL**: Must fix before merging
- **WARNING**: Should address soon
- **INFO**: Consider improving
"""
```

### Pattern 3: MCP Client with Tool Execution

```python
from __future__ import annotations

from mcp import ClientSession
from mcp.client.stdio import stdio_client, StdioServerParameters


async def run_mcp_tools():
    """Connect to an MCP server and execute tools.

    This client connects via stdio transport, lists available tools,
    and executes them with arguments.
    """
    server_params = StdioServerParameters(
        command="python",
        args=["path/to/server.py"],
    )

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            # Initialize the connection
            await session.initialize()

            # List available tools
            tools_result = await session.list_tools()
            print(f"Available tools: {[t.name for t in tools_result.tools]}")

            # Execute a tool
            result = await session.call_tool(
                "get_repo_stats",
                arguments={"owner": "langchain-ai", "repo": "langchain"},
            )
            for content in result.content:
                if content.type == "text":
                    print(content.text)


# For Streamable HTTP transport:
async def connect_via_http(url: str) -> None:
    """Connect to a remote MCP server via Streamable HTTP.

    Args:
        url: The server URL (e.g., 'https://mcp.example.com/sse').
    """
    from mcp.client.sse import sse_client

    async with sse_client(url) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools = await session.list_tools()
            print(f"Remote tools: {[t.name for t in tools.tools]}")
```

---

## Constraints

### MUST DO
- Use `FastMCP` for new MCP servers — it handles protocol compliance, connection management, and schema generation
- Use `@mcp.tool()` for tools (actions with side effects) and `@mcp.resource()` for resources (data without side effects)
- Provide typed parameters with descriptive docstrings — FastMCP generates JSON schemas from these
- Test servers with `mcp dev server.py` (development mode with inspector UI) and `mcp run server.py` (production)
- Use async functions for tools and resources to support concurrent operations
- Accept an optional `Context` parameter in tools for logging and progress reporting

### MUST NOT DO
- Implement MCP protocol messages manually — FastMCP handles all protocol details
- Use tools for read-only data access (use resources instead)
- Use resources for operations with side effects (use tools instead)
- Expose sensitive credentials, tokens, or secrets as resource content
- Skip CORS configuration for Streamable HTTP servers accessed from browser-based MCP clients

---

## Live References

| Resource | URL |
|----------|-----|
| MCP Python SDK (PyPI) | https://pypi.org/project/mcp/ |
| MCP Python SDK GitHub | https://github.com/modelcontextprotocol/python-sdk |
| MCP Specification | https://spec.modelcontextprotocol.io/ |
| MCP Documentation | https://modelcontextprotocol.io/ |
| FastMCP Server Guide | https://github.com/modelcontextprotocol/python-sdk#quickstart |
| MCP Client Examples | https://github.com/modelcontextprotocol/python-sdk#writing-mcp-clients |
| Anthropic MCP Connector | https://docs.anthropic.com/en/docs/agents-and-tools/mcp-connector |

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-anthropic-api` | Using MCP tools via the Anthropic Claude MCP connector |
| `coding-langchain` | Consuming MCP tools in LangChain agents with dynamic tool loading |
| `coding-openai-api` | Using MCP tools with OpenAI Responses API |
