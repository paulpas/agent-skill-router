---
name: mcp-client-integration
description: Integrates MCP clients using Python SDK v2 and TypeScript SDK v2 to connect to MCP servers, manage tools/resources/prompts, handle transport (stdio/SSE), error recovery, and implement structured calling conventions in AI agent applications.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  role: implementation
  scope: implementation
  output-format: code
  triggers: mcp client, mcp integration, how do i connect to mcp, consuming mcp servers, claude mcp client, typescript mcp, tool invocation
  related-skills: mcp-server-fastmcp-python, mcp-tool-design-patterns
  archetypes: tactical
  anti_triggers: brainstorming, vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
---

# MCP Client Integration

Implement MCP clients that connect to MCP servers, discover tools/resources/prompts, handle transport layers (stdio, SSE), and invoke server capabilities with proper error recovery in AI agent applications.

## TL;DR Checklist

- [ ] Choose transport type: stdio (local), SSE (HTTP), or custom connection
- [ ] Initialize client with proper server configuration and timeout settings
- [ ] Implement tool discovery and resource caching mechanisms
- [ ] Handle all error cases: timeouts, malformed responses, tool not found
- [ ] Close connections gracefully on shutdown (context managers / async cleanup)
- [ ] Test tool invocation with realistic error scenarios before production
- [ ] Document required environment variables and server endpoints

---

## When to Use

Use this skill when:

- Building an AI agent that needs to consume tools from external MCP servers
- Integrating Claude SDK with MCP clients for tool discovery and invocation
- Connecting to local stdio-based servers (e.g., filesystem, database servers)
- Consuming HTTP SSE-based MCP servers (streaming transport)
- Implementing fallback/retry logic for unreliable MCP server connections
- Caching tool/resource metadata to reduce server load

---

## When NOT to Use

Avoid this skill for:

- Building an MCP server (use `mcp-server-fastmcp-python` instead)
- One-off tool calls without agent context (use raw HTTP requests)
- Servers that don't implement MCP protocol (use native SDKs)
- Synchronous code that can't handle async/await patterns (refactor to async)
- Simple shell commands or subprocess calls (use `subprocess` module directly)

---

## Core Workflow

### 1. **Initialize Client with Transport**

Choose the appropriate transport layer based on server type:

- **Stdio**: Local in-process or subprocess servers
- **SSE (HTTP)**: Remote servers, streaming responses
- **Custom**: Bidirectional WebSocket or other protocols

**Checkpoint:** Server is running, endpoint/executable is accessible, credentials are configured.

### 2. **Discover Available Capabilities**

List and cache:
- **Tools**: Callable functions with inputs/outputs
- **Resources**: Named data sources (files, databases, API endpoints)
- **Prompts**: Pre-defined prompt templates

**Checkpoint:** Tool catalog is populated, resource URIs are validated.

### 3. **Invoke Tools with Error Handling**

Call tools with proper:
- Type validation for inputs
- Timeout constraints
- Error classification (recoverable vs permanent)
- Retry logic for transient failures

**Checkpoint:** Tool invocation succeeds or raises descriptive error with context.

### 4. **Manage Connection Lifecycle**

Maintain connection with:
- Graceful initialization (handshake, capability negotiation)
- Periodic health checks for long-lived connections
- Proper cleanup on shutdown (close, disconnect)
- Recovery from connection loss

**Checkpoint:** Client can reconnect automatically, resources are freed on exit.

---

## Implementation Patterns

### Pattern 1: Python Client with Stdio Transport

Use this for local MCP servers running as subprocesses (e.g., `mcp-server-filesystem`, `mcp-server-postgres`).

```python
import asyncio
import json
from mcp import ClientSession, StdioServerParameters
from anthropic import Anthropic

class MCPClientManager:
    """Manage MCP client connection and tool invocation."""
    
    def __init__(self, server_path: str, server_args: list = None):
        """Initialize stdio-based MCP client.
        
        Args:
            server_path: Path to MCP server executable
            server_args: Command-line arguments for server
        
        Raises:
            FileNotFoundError: If server executable doesn't exist
            ValueError: If server_path is empty
        """
        if not server_path:
            raise ValueError("server_path cannot be empty")
        
        self.server_path = server_path
        self.server_args = server_args or []
        self.session: ClientSession = None
        self.tools_cache: dict = {}
    
    async def connect(self) -> None:
        """Establish connection to MCP server via stdio.
        
        Raises:
            ConnectionError: If server fails to start or handshake fails
            TimeoutError: If connection takes longer than 10 seconds
        """
        params = StdioServerParameters(
            command=self.server_path,
            args=self.server_args
        )
        
        try:
            self.session = await asyncio.wait_for(
                ClientSession.create(params),
                timeout=10.0
            )
        except asyncio.TimeoutError:
            raise TimeoutError(f"MCP server {self.server_path} failed to start within 10s")
        except Exception as e:
            raise ConnectionError(f"Failed to connect to MCP server: {e}")
    
    async def discover_tools(self) -> list[dict]:
        """Discover available tools from MCP server.
        
        Returns:
            List of tool definitions with name, description, input schema
        
        Raises:
            RuntimeError: If not connected to server
            ValueError: If tool discovery fails
        """
        if not self.session:
            raise RuntimeError("Not connected. Call connect() first.")
        
        try:
            response = await self.session.list_tools()
            self.tools_cache = {tool.name: tool for tool in response.tools}
            return [
                {
                    "name": tool.name,
                    "description": tool.description,
                    "input_schema": tool.inputSchema
                }
                for tool in response.tools
            ]
        except Exception as e:
            raise ValueError(f"Tool discovery failed: {e}")
    
    async def invoke_tool(self, tool_name: str, arguments: dict) -> str:
        """Invoke a tool on the MCP server.
        
        Args:
            tool_name: Name of tool to invoke
            arguments: Input arguments (must match tool's inputSchema)
        
        Returns:
            Tool result as JSON string
        
        Raises:
            ValueError: If tool not found or arguments invalid
            TimeoutError: If invocation exceeds 30 seconds
            RuntimeError: If server returns error response
        """
        if not self.session:
            raise RuntimeError("Not connected. Call connect() first.")
        
        if tool_name not in self.tools_cache:
            raise ValueError(f"Tool '{tool_name}' not found. Available: {list(self.tools_cache.keys())}")
        
        try:
            result = await asyncio.wait_for(
                self.session.call_tool(tool_name, arguments),
                timeout=30.0
            )
            return json.dumps(result.content)
        except asyncio.TimeoutError:
            raise TimeoutError(f"Tool invocation '{tool_name}' exceeded 30s timeout")
        except Exception as e:
            raise RuntimeError(f"Tool invocation failed: {tool_name}: {e}")
    
    async def close(self) -> None:
        """Close MCP session gracefully.
        
        Raises:
            RuntimeError: If close fails (logs error, continues shutdown)
        """
        if self.session:
            try:
                await self.session.close()
            except Exception as e:
                print(f"Warning: Error closing MCP session: {e}")
            finally:
                self.session = None


async def example_usage():
    """Example: Connect to filesystem server and list files."""
    manager = MCPClientManager("/usr/local/bin/mcp-server-filesystem")
    
    try:
        await manager.connect()
        tools = await manager.discover_tools()
        print(f"Available tools: {[t['name'] for t in tools]}")
        
        # Invoke 'list_directory' tool
        result = await manager.invoke_tool(
            "list_directory",
            {"path": "/tmp"}
        )
        print(f"Directory listing: {result}")
    
    finally:
        await manager.close()


# Run example
if __name__ == "__main__":
    asyncio.run(example_usage())
```

---

### Pattern 2: TypeScript Client with Tool Caching and Retry

Use this for integrating MCP clients with Claude SDK in TypeScript agents.

```typescript
import Anthropic from "@anthropic-ai/sdk";

interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

class MCPClientWithRetry {
  private client: Anthropic;
  private toolsCache: Map<string, ToolDefinition> = new Map();
  private maxRetries: number = 3;
  private retryDelayMs: number = 1000;

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Discover and cache tools from MCP server.
   * Caching reduces server load on repeated agent loops.
   */
  async discoverTools(): Promise<ToolDefinition[]> {
    // In real implementation, fetch from MCP server
    // For demo, return mock tools
    const tools: ToolDefinition[] = [
      {
        name: "get_weather",
        description: "Get current weather for a location",
        input_schema: {
          type: "object",
          properties: {
            location: {
              type: "string",
              description: "City name",
            },
          },
          required: ["location"],
        },
      },
    ];

    tools.forEach((tool) => this.toolsCache.set(tool.name, tool));
    return tools;
  }

  /**
   * Invoke tool with exponential backoff retry logic.
   * Handles transient failures gracefully.
   */
  async invokeTool(
    toolName: string,
    arguments: Record<string, unknown>
  ): Promise<string> {
    if (!this.toolsCache.has(toolName)) {
      throw new Error(
        `Tool '${toolName}' not found. Available: ${Array.from(this.toolsCache.keys()).join(", ")}`
      );
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        // In real implementation, call actual MCP server
        // For demo, simulate tool invocation
        return await this.simulateToolCall(toolName, arguments);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if error is retryable
        if (!this.isRetryable(lastError)) {
          throw lastError;
        }

        // Exponential backoff: 1s, 2s, 4s
        if (attempt < this.maxRetries) {
          const delayMs = this.retryDelayMs * Math.pow(2, attempt - 1);
          console.warn(
            `Tool invocation failed (attempt ${attempt}/${this.maxRetries}), retrying in ${delayMs}ms: ${lastError.message}`
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    throw new Error(
      `Tool invocation '${toolName}' failed after ${this.maxRetries} retries: ${lastError?.message}`
    );
  }

  /**
   * Classify errors as retryable (transient) or permanent.
   */
  private isRetryable(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes("timeout") ||
      message.includes("econnrefused") ||
      message.includes("econnreset") ||
      message.includes("503") ||
      message.includes("service unavailable")
    );
  }

  /**
   * Simulate tool call (replace with actual MCP server invocation).
   */
  private async simulateToolCall(
    toolName: string,
    arguments: Record<string, unknown>
  ): Promise<string> {
    // Simulate network call
    await new Promise((resolve) => setTimeout(resolve, 50));
    return JSON.stringify({
      tool: toolName,
      input: arguments,
      result: "Tool executed successfully",
    });
  }

  /**
   * Run agent loop with tool use.
   * Demonstrates integration with Claude SDK.
   */
  async runAgent(userMessage: string): Promise<string> {
    const tools = await this.discoverTools();

    const messages: Anthropic.MessageParam[] = [
      {
        role: "user",
        content: userMessage,
      },
    ];

    // Convert tool definitions to Claude SDK format
    const claudeTools: Anthropic.Tool[] = tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.input_schema,
    }));

    let response = await this.client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      tools: claudeTools,
      messages: messages,
    });

    // Process tool calls in agent loop
    while (response.stop_reason === "tool_use") {
      const toolUseBlock = response.content.find(
        (block) => block.type === "tool_use"
      ) as Anthropic.ToolUseBlock | undefined;

      if (!toolUseBlock) break;

      const toolName = toolUseBlock.name;
      const toolInput = toolUseBlock.input as Record<string, unknown>;

      try {
        const toolResult = await this.invokeTool(toolName, toolInput);

        // Continue conversation with tool result
        messages.push({
          role: "assistant",
          content: response.content,
        });

        messages.push({
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: toolUseBlock.id,
              content: toolResult,
            },
          ],
        });

        response = await this.client.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 1024,
          tools: claudeTools,
          messages: messages,
        });
      } catch (error) {
        // Return error to Claude
        const errorMsg = error instanceof Error ? error.message : String(error);
        messages.push({
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: toolUseBlock.id,
              is_error: true,
              content: errorMsg,
            },
          ],
        });

        response = await this.client.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 1024,
          tools: claudeTools,
          messages: messages,
        });
      }
    }

    // Extract final text response
    const textBlock = response.content.find((block) => block.type === "text");
    return textBlock && "text" in textBlock ? textBlock.text : "";
  }
}

// Usage
const client = new MCPClientWithRetry();
client.runAgent("What's the weather in San Francisco?");
```

---

### Pattern 3: BAD vs GOOD Error Handling

#### ❌ BAD: Silent Failures and Unclear Recovery

```python
async def invoke_tool_bad(tool_name: str, args: dict) -> dict:
    """Dangerous: Silently fails, no clear error context."""
    try:
        result = await session.call_tool(tool_name, args)
        return result.content
    except:
        # What error? What tool failed? No context.
        return {}  # Silent failure — caller has no idea what went wrong
    
    # No timeout protection → can hang indefinitely
    # No retry logic → transient failures break the agent
    # No validation → malformed responses corrupt downstream logic
```

**Problems:**
- Empty dict is indistinguishable from successful "no result" case
- Caller has no information about what failed or why
- No timeout means a slow/hanging server blocks the entire agent
- No retry for transient failures (network hiccups, server restart)

#### ✅ GOOD: Explicit Error Types and Context

```python
class ToolInvocationError(Exception):
    """Base exception for tool invocation failures."""
    def __init__(self, tool_name: str, reason: str, is_retryable: bool = False):
        self.tool_name = tool_name
        self.reason = reason
        self.is_retryable = is_retryable
        super().__init__(f"Tool '{tool_name}' failed: {reason}")


async def invoke_tool_good(
    tool_name: str,
    arguments: dict,
    max_retries: int = 3,
    timeout_seconds: float = 30.0
) -> dict:
    """Correct: Clear errors, retry logic, timeout protection.
    
    Args:
        tool_name: Name of tool to invoke
        arguments: Input arguments for tool
        max_retries: Number of retries for transient errors
        timeout_seconds: Maximum time for single invocation
    
    Returns:
        Tool result dictionary
    
    Raises:
        ToolInvocationError: With clear reason and retryability flag
        ValueError: If arguments don't match tool schema
    """
    if tool_name not in tools_cache:
        raise ValueError(
            f"Tool '{tool_name}' not found in available tools: {list(tools_cache.keys())}"
        )
    
    last_error = None
    
    for attempt in range(1, max_retries + 1):
        try:
            # Timeout protection: prevents hanging on slow servers
            result = await asyncio.wait_for(
                session.call_tool(tool_name, arguments),
                timeout=timeout_seconds
            )
            
            # Validate response structure
            if not hasattr(result, "content"):
                raise ToolInvocationError(
                    tool_name,
                    "Malformed response: missing 'content' field",
                    is_retryable=False
                )
            
            return result.content
        
        except asyncio.TimeoutError:
            last_error = ToolInvocationError(
                tool_name,
                f"Timeout after {timeout_seconds}s",
                is_retryable=True
            )
        except ConnectionError as e:
            last_error = ToolInvocationError(
                tool_name,
                f"Connection error: {e}",
                is_retryable=True
            )
        except ValueError as e:
            # Schema validation error — not retryable
            raise ToolInvocationError(
                tool_name,
                f"Invalid arguments: {e}",
                is_retryable=False
            )
        except Exception as e:
            last_error = ToolInvocationError(
                tool_name,
                f"Unexpected error: {type(e).__name__}: {e}",
                is_retryable=False
            )
        
        # If not retryable, fail immediately
        if last_error and not last_error.is_retryable:
            raise last_error
        
        # Exponential backoff before retry
        if attempt < max_retries:
            backoff_seconds = 2 ** (attempt - 1)  # 1s, 2s, 4s, ...
            print(f"Attempt {attempt}/{max_retries} failed, retrying in {backoff_seconds}s: {last_error.reason}")
            await asyncio.sleep(backoff_seconds)
    
    # All retries exhausted
    raise last_error or ToolInvocationError(
        tool_name,
        f"Failed after {max_retries} retries",
        is_retryable=False
    )


# Usage with proper error handling
try:
    result = await invoke_tool_good("list_files", {"directory": "/tmp"})
    print(f"Success: {result}")
except ToolInvocationError as e:
    if e.is_retryable:
        print(f"Transient error (safe to retry): {e.reason}")
        # Agent can decide to retry or backoff
    else:
        print(f"Permanent error (don't retry): {e.reason}")
        # Agent should fail immediately
```

**Improvements:**
- Explicit error types with `is_retryable` flag for agent decision-making
- Timeout protection prevents hanging
- Exponential backoff reduces server load on transient failures
- Clear context in error messages (tool name, reason, suggestion)
- Validates response structure before returning
- Distinguishes transient (timeout, connection) from permanent (validation, not found) errors

---

## Error Recovery Patterns

### Handling Timeouts

```python
import asyncio

async def invoke_with_timeout(tool_name: str, args: dict, timeout_sec: float = 30.0) -> dict:
    """Invoke tool with timeout and graceful timeout handling."""
    try:
        result = await asyncio.wait_for(
            session.call_tool(tool_name, args),
            timeout=timeout_sec
        )
        return result.content
    except asyncio.TimeoutError:
        raise TimeoutError(
            f"Tool '{tool_name}' did not respond within {timeout_sec}s. "
            f"Server may be overloaded or hung. Consider increasing timeout or retrying."
        )
```

### Handling Tool Not Found

```python
async def safe_invoke_tool(tool_name: str, args: dict) -> dict:
    """Invoke tool with validation that it exists first."""
    available_tools = {t.name for t in (await session.list_tools()).tools}
    
    if tool_name not in available_tools:
        raise ValueError(
            f"Tool '{tool_name}' not found. Available tools: {', '.join(sorted(available_tools))}"
        )
    
    return (await session.call_tool(tool_name, args)).content
```

### Handling Malformed Responses

```python
import json

async def invoke_with_validation(tool_name: str, args: dict) -> dict:
    """Invoke tool and validate response structure."""
    result = await session.call_tool(tool_name, args)
    
    # Validate response has required fields
    if not isinstance(result.content, (list, dict, str)):
        raise ValueError(
            f"Malformed response from '{tool_name}': "
            f"expected dict/list/str, got {type(result.content).__name__}"
        )
    
    # Try to parse if JSON string
    if isinstance(result.content, str):
        try:
            return json.loads(result.content)
        except json.JSONDecodeError as e:
            raise ValueError(
                f"Tool '{tool_name}' returned invalid JSON: {e}"
            )
    
    return result.content
```

---

## Transport Layer Details

### Stdio Transport (Local Servers)

Best for:
- Local development
- Private MCP servers (filesystem, database)
- Low-latency requirements
- Subprocess-managed servers

```python
from mcp import StdioServerParameters, ClientSession

# Launch server as subprocess
params = StdioServerParameters(
    command="/usr/local/bin/mcp-server-postgres",
    args=["--database", "production"]
)

session = await ClientSession.create(params)
```

**Advantages:** Direct process control, low latency, secure (no network)  
**Disadvantages:** Server must run locally, subprocess management overhead

### SSE Transport (HTTP Streaming)

Best for:
- Remote servers (cloud deployments)
- Firewall-friendly (HTTP only)
- Multi-tenant architectures
- Load-balanced server instances

```python
from mcp import ServerParameters
import aiohttp

# Connect to HTTP SSE server
async with aiohttp.ClientSession() as http_session:
    params = ServerParameters(
        url="https://mcp-server.example.com/sse",
        headers={"Authorization": f"Bearer {api_key}"}
    )
    session = await ClientSession.create(params)
```

**Advantages:** Remote access, scalable, firewall-friendly  
**Disadvantages:** Network latency, requires server deployment

---

## Connection Lifecycle Management

### Proper Initialization (Handshake)

```python
async def connect_and_verify(server_path: str) -> ClientSession:
    """Connect with verification that server is responsive."""
    session = await ClientSession.create(StdioServerParameters(command=server_path))
    
    try:
        # Verify server is responsive by listing tools
        tools_response = await asyncio.wait_for(
            session.list_tools(),
            timeout=5.0
        )
        print(f"Connected. Available tools: {[t.name for t in tools_response.tools]}")
        return session
    except Exception as e:
        await session.close()
        raise ConnectionError(f"Server verification failed: {e}")
```

### Graceful Shutdown

```python
async def shutdown_client(session: ClientSession) -> None:
    """Close connection and cleanup resources."""
    try:
        await session.close()
        print("Client closed gracefully")
    except Exception as e:
        print(f"Warning: Error closing client: {e}")
    finally:
        # Ensure cleanup even if close() fails
        session = None
```

### Context Manager Pattern (Recommended)

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def mcp_client(server_path: str):
    """Context manager ensures proper cleanup."""
    session = None
    try:
        session = await ClientSession.create(StdioServerParameters(command=server_path))
        yield session
    finally:
        if session:
            await session.close()

# Usage
async with mcp_client("/usr/local/bin/mcp-server-filesystem") as session:
    tools = await session.list_tools()
    # Do work...
# Session automatically closed when exiting block
```

---

## Best Practices

### 1. Cache Tool Metadata

```python
class MCPClient:
    def __init__(self):
        self.tools_cache: dict = {}
        self.cache_timestamp = None
        self.cache_ttl_seconds = 3600  # Refresh every hour
    
    async def get_tools(self, force_refresh: bool = False) -> list:
        """Get tools with caching to reduce server load."""
        import time
        
        now = time.time()
        should_refresh = (
            force_refresh or
            not self.tools_cache or
            (self.cache_timestamp and now - self.cache_timestamp > self.cache_ttl_seconds)
        )
        
        if should_refresh:
            tools = await self.session.list_tools()
            self.tools_cache = {t.name: t for t in tools.tools}
            self.cache_timestamp = now
        
        return list(self.tools_cache.values())
```

### 2. Implement Health Checks

```python
async def health_check(session: ClientSession, timeout_sec: float = 5.0) -> bool:
    """Quick check that server is responsive."""
    try:
        await asyncio.wait_for(
            session.list_tools(),
            timeout=timeout_sec
        )
        return True
    except Exception:
        return False
```

### 3. Type-Safe Tool Invocation

```python
from typing import TypedDict

class WeatherInput(TypedDict):
    location: str
    unit: str  # "celsius" or "fahrenheit"

async def get_weather(args: WeatherInput) -> dict:
    """Type-safe wrapper for weather tool."""
    return await invoke_tool("get_weather", args)
```

---

## Constraints

### MUST DO

- **Always use context managers or async cleanup** for connection lifecycle management
- **Implement timeout protection** for all tool invocations (prevent hanging)
- **Classify errors as retryable vs permanent** to guide agent behavior
- **Cache tool/resource metadata** to reduce server load
- **Validate tool response structure** before using results
- **Log clear error messages** with tool name, reason, and recovery suggestion
- **Test with realistic error scenarios** (timeouts, missing tools, malformed responses) before production
- **Use exponential backoff** for retrying transient failures (1s, 2s, 4s, ...)
- **Document required environment variables** and server endpoint configuration
- **Handle connection loss gracefully** with automatic reconnection for long-lived clients

---

### MUST NOT DO

- **Do NOT silently fail** with empty results or default values — throw descriptive errors
- **Do NOT use generic exception catching** without classifying error type
- **Do NOT retry permanent errors** (invalid arguments, tool not found) — waste time and resources
- **Do NOT invoke unbounded retries** — cap at 3-5 retries with backoff
- **Do NOT block on tool invocation** without timeout — can hang the entire agent
- **Do NOT assume tools are cached** — call list_tools() if unsure
- **Do NOT parse malformed tool responses** without validation — corrupts downstream logic
- **Do NOT share client sessions** across async tasks without synchronization
- **Do NOT hardcode server paths/URLs** — use environment variables and config files
- **Do NOT leave connections open** on shutdown — implement proper cleanup

---

## Resource Discovery and Management

### Listing Resources

```python
async def discover_resources(session: ClientSession) -> dict[str, list]:
    """Discover and categorize available resources."""
    response = await session.list_resources()
    
    resources_by_type = {}
    for resource in response.resources:
        resource_type = resource.uri.split("://")[0]  # e.g., "file", "database"
        if resource_type not in resources_by_type:
            resources_by_type[resource_type] = []
        resources_by_type[resource_type].append({
            "uri": resource.uri,
            "name": resource.name,
            "description": resource.description,
            "mime_type": resource.mimeType
        })
    
    return resources_by_type
```

### Reading Resource Content

```python
async def read_resource(session: ClientSession, resource_uri: str) -> str:
    """Read content from a resource (file, database query, API response)."""
    try:
        response = await asyncio.wait_for(
            session.read_resource(resource_uri),
            timeout=10.0
        )
        
        # Handle different response types
        if isinstance(response.contents, str):
            return response.contents
        elif isinstance(response.contents, bytes):
            return response.contents.decode("utf-8")
        else:
            return str(response.contents)
    
    except asyncio.TimeoutError:
        raise TimeoutError(f"Reading resource '{resource_uri}' exceeded timeout")
    except Exception as e:
        raise RuntimeError(f"Failed to read resource '{resource_uri}': {e}")
```

---

## Testing Integration

### Unit Test for Tool Invocation

```python
import pytest
from unittest.mock import AsyncMock, MagicMock

@pytest.mark.asyncio
async def test_invoke_tool_success():
    """Test successful tool invocation."""
    # Mock session
    mock_session = AsyncMock()
    mock_response = MagicMock()
    mock_response.content = {"result": "success"}
    mock_session.call_tool.return_value = mock_response
    
    # Test invocation
    result = await invoke_tool_good("test_tool", {"arg": "value"})
    assert result == {"result": "success"}
    mock_session.call_tool.assert_called_once_with("test_tool", {"arg": "value"})


@pytest.mark.asyncio
async def test_invoke_tool_not_found():
    """Test error when tool doesn't exist."""
    with pytest.raises(ValueError, match="Tool 'missing_tool' not found"):
        await invoke_tool_good("missing_tool", {})


@pytest.mark.asyncio
async def test_invoke_tool_timeout():
    """Test timeout handling and retry logic."""
    mock_session = AsyncMock()
    mock_session.call_tool.side_effect = asyncio.TimeoutError()
    
    with pytest.raises(ToolInvocationError) as exc_info:
        await invoke_tool_good("slow_tool", {}, max_retries=1, timeout_seconds=0.1)
    
    assert "Timeout" in str(exc_info.value)
```

---

## Common Integration Patterns

### Pattern: Agent with Tool Use Loop

```python
async def agent_loop_with_tools(user_message: str, max_iterations: int = 10) -> str:
    """Run agent loop that invokes tools until completion."""
    messages = [{"role": "user", "content": user_message}]
    
    for iteration in range(max_iterations):
        # Get Claude response
        response = await client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            tools=[tool.to_claude_format() for tool in available_tools],
            messages=messages
        )
        
        if response.stop_reason == "end_turn":
            # Claude finished
            return extract_text(response)
        
        if response.stop_reason == "tool_use":
            # Process tool calls
            for block in response.content:
                if block.type == "tool_use":
                    try:
                        result = await invoke_tool_good(block.name, block.input)
                        messages.append({"role": "assistant", "content": response.content})
                        messages.append({
                            "role": "user",
                            "content": [{
                                "type": "tool_result",
                                "tool_use_id": block.id,
                                "content": json.dumps(result)
                            }]
                        })
                    except ToolInvocationError as e:
                        # Return error to Claude
                        messages.append({
                            "role": "user",
                            "content": [{
                                "type": "tool_result",
                                "tool_use_id": block.id,
                                "is_error": True,
                                "content": e.reason
                            }]
                        })
    
    return "Max iterations reached"
```

---

## Related Documentation

- **MCP Protocol Specification**: https://modelcontextprotocol.io
- **Claude SDK for Python**: https://github.com/anthropics/anthropic-sdk-python
- **Claude SDK for TypeScript**: https://github.com/anthropics/anthropic-sdk-typescript
- **MCP Server Pattern**: See `mcp-server-fastmcp-python` skill
- **Tool Design**: See `mcp-tool-design-patterns` skill
