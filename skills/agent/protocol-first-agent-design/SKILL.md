---
name: protocol-first-agent-design
description: Designs AI agent architectures using protocol-first patterns (MCP tool interfaces, A2A inter-agent communication) instead of framework-specific APIs, ensuring interoperability and avoiding vendor lock-in.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  triggers: MCP protocol, A2A agent protocol, model context protocol, agent interoperability, protocol-first design, vendor lock-in prevention, agent communication patterns, MCP server
  archetypes: [strategic, tactical]
  anti_triggers: [vague ideation, brainstorming]
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, examples, do-dont]
  related-skills: ai-framework-comparison, observability-patterns, framework-utilization
---

# Protocol-First Agent Design

Architects AI agents using open protocols (MCP for tool interfaces, A2A for agent communication) as the primary abstraction layer. Enables framework-agnostic design where agents and tools can be swapped without rewriting core logic, preventing vendor lock-in while maintaining production-grade interoperability.

## TL;DR Checklist

- [ ] Define protocol interfaces before choosing any specific framework or model provider
- [ ] Implement MCP-compliant tool server with typed schemas and error handling
- [ ] Design inter-agent communication using A2A message formats and channel patterns
- [ ] Build abstraction layer that translates between protocols and framework-native APIs
- [ ] Add contract tests validating protocol compliance across all agent-tool interactions

---

## When to Use

Use this skill when:

- Designing an AI agent system from scratch where long-term maintainability matters
- Migrating between frameworks (e.g., LangGraph to CrewAI) without rewriting business logic
- Building multi-agent systems that must interoperate with external agents from other organizations
- Enterprise environments with strict requirements around vendor lock-in prevention and data sovereignty

## When NOT to Use

Avoid this skill for:
- Rapid prototyping or hackathon projects where speed matters more than architecture — use framework-native patterns directly
- Single-use, throwaway agent implementations where long-term interoperability is irrelevant
- Projects with only one required framework that has no migration path planned

---

## Core Workflow

1. **Define Protocol Interfaces** — Start by specifying MCP tool schemas and A2A message contracts before writing any framework code. Use JSON Schema for tool definitions and define message types (IntentMessage, TaskStatusUpdate, ArtifactTransfer) using protobuf or JSON Schema. This creates a stable API boundary that both your agents and tools must implement regardless of underlying framework.

2. **Implement MCP Tool Server** — Build the tool server as an independent module using the official MCP SDK (Python or TypeScript). Define each tool with explicit input/output schemas, implement error handling with structured error responses per MCP spec, and register tools through standard MCP initialization handshake. The tool server must be runnable independently of any agent framework.

3. **Design A2A Agent Channels** — Create communication channels between agents using the A2A protocol format. Define message exchange patterns: request-response (task delegation), pub-sub (event broadcasting), and streaming (progress updates). Implement channel routing that maps logical agent roles to physical transport endpoints, allowing agents to be redeployed without changing communication contracts.

4. **Build Abstraction Layer** — Create a thin translation layer that connects protocol interfaces to your chosen framework's native APIs. For LangGraph, translate MCP tool calls into LangChain RunnableBinding adapters. For CrewAI, wrap MCP tools in CrewAI Action objects. This layer isolates framework-specific code so switching frameworks requires changes only in the adapter, not in agent logic.

5. **Add Contract Tests** — Write integration tests that validate every tool implementation against its MCP JSON Schema and every agent message exchange against A2A protocol formats. Run these contract tests as part of CI to catch breaking changes before they reach production. Use schema validation libraries (pydantic-jsonschema, ajv) for automated checking.

## Implementation Patterns

### Pattern 1: MCP Tool Server with Typed Schemas

```python
"""MCP-compliant tool server implementation."""

from typing import Any
from dataclasses import dataclass, field

# Minimal MCP-style tool definition using JSON Schema
@dataclass
class MCPToolDefinition:
    """Represents an MCP-compatible tool definition."""
    name: str
    description: str
    input_schema: dict[str, Any]  # Valid JSON Schema object
    output_schema: dict[str, Any] | None = None

    def to_mcp_format(self) -> dict[str, Any]:
        """Convert to MCP protocol tool list format."""
        return {
            "name": self.name,
            "description": self.description,
            "inputSchema": self.input_schema,
        }


@dataclass
class MCPToolError(Exception):
    """Structured error response per MCP specification."""
    code: int
    message: str
    details: dict[str, Any] = field(default_factory=dict)

    def to_mcp_format(self) -> dict[str, Any]:
        return {
            "error": {
                "code": self.code,
                "message": self.message,
                "data": self.details,
            }
        }


class MCPToolRegistry:
    """Registers and dispatches MCP-compatible tools."""

    def __init__(self):
        self._tools: dict[str, MCPToolDefinition] = {}

    def register(self, tool_def: MCPToolDefinition) -> None:
        """Register a tool with its definition and handler."""
        if tool_def.name in self._tools:
            raise ValueError(f"Tool '{tool_def.name}' already registered")
        self._tools[tool_def.name] = tool_def

    def get_tools_list(self) -> list[dict[str, Any]]:
        """Return tools in MCP protocol format."""
        return [t.to_mcp_format() for t in self._tools.values()]

    async def invoke(self, tool_name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        """Invoke a registered tool with validated arguments."""
        if tool_name not in self._tools:
            raise MCPToolError(code=-32601, message=f"Unknown tool: {tool_name}")

        # Schema validation before execution
        import jsonschema
        try:
            jsonschema.validate(instance=arguments, schema=self._tools[tool_name].input_schema)
        except jsonschema.ValidationError as e:
            raise MCPToolError(
                code=-32602,
                message=f"Invalid arguments for tool '{tool_name}': {e.message}",
                details={"path": list(e.path)},
            )

        # Dispatch to handler — implemented by framework adapter layer
        handler = self._get_handler(tool_name)
        try:
            result = await handler(arguments)
            return {"content": [{"type": "text", "text": str(result)}]}
        except Exception as e:
            raise MCPToolError(
                code=-32000,
                message=f"Tool execution failed: {e}",
                details={"tool": tool_name},
            )

    def _get_handler(self, tool_name: str) -> Any:
        # Resolved by framework adapter layer at runtime
        raise NotImplementedError("Handler resolution requires framework adapter")


# Example tool definition with JSON Schema input validation
weather_tool = MCPToolDefinition(
    name="get_weather",
    description="Retrieve current weather data for a location",
    input_schema={
        "type": "object",
        "properties": {
            "location": {"type": "string", "description": "City or coordinates"},
            "units": {"type": "string", "enum": ["celsius", "fahrenheit"], "default": "celsius"},
            "forecast_hours": {"type": "integer", "minimum": 1, "maximum": 72},
        },
        "required": ["location"],
    },
)
```

### Pattern 2: A2A Agent Communication Channel (BAD vs. GOOD)

```python
# ❌ BAD — Framework-specific communication tightly couples agents to CrewAI or LangGraph
from crewai import Agent as CrewAIAgent, Task as CrewAITask  # framework lock-in

class BadAgentCommunication:
    """Tightly coupled agent communication using framework internals."""

    def __init__(self):
        self.agents = [
            CrewAIAgent(role="researcher", goal="find data", backstory="data finder"),
            CrewAIAIMessage(content="pass context between agents"),  # non-standard
        ]
        # Communication depends on CrewAI's internal task delegation —
        # cannot be swapped without rewriting all agent definitions

    def run(self, input_data: str) -> str:
        return "CrewAI-internal result"  # No protocol abstraction


# ✅ GOOD — Protocol-first communication using A2A message format
import json
from dataclasses import dataclass, asdict
from enum import Enum
from datetime import datetime, timezone


class A2AMessageType(str, Enum):
    """Standardized A2A message types per protocol spec."""
    REQUEST = "task.request"
    RESPONSE = "task.response"
    UPDATE = "task.update"
    ERROR = "task.error"


@dataclass
class A2AMessage:
    """A2A-protocol-compliant message between agents."""
    id: str
    type: A2AMessageType
    sender: str
    recipient: str
    session_id: str
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    # Request-specific fields
    task_id: str | None = None
    goal: str | None = None
    context: dict[str, Any] | None = None

    # Response/Update-specific fields
    result: Any = None
    status: str | None = None
    progress: float | None = None
    artifacts: list[dict[str, Any]] | None = None

    def to_dict(self) -> dict[str, Any]:
        return {k: v for k, v in asdict(self).items() if v is not None}

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "A2AMessage":
        msg_type = A2AMessageType(data.get("type", ""))
        if msg_type == A2AMessageType.REQUEST:
            return cls(
                id=data["id"], type=msg_type, sender=data["sender"],
                recipient=data["recipient"], session_id=data["session_id"],
                task_id=data.get("task_id"), goal=data["goal"],
                context=data.get("context"),
            )
        # ... handle other message types similarly
        raise ValueError(f"Unsupported A2A message type: {msg_type}")


class A2AChannel:
    """Manages agent-to-agent communication via A2A protocol channels."""

    def __init__(self, channel_id: str):
        self.channel_id = channel_id
        self._pending_requests: dict[str, list] = {}  # task_id -> [callback futures]

    def send_request(
        self, sender: str, recipient: str, session_id: str,
        task_id: str, goal: str, context: dict[str, Any] | None = None,
    ) -> A2AMessage:
        """Send a task request via A2A protocol format."""
        message = A2AMessage(
            id=f"{self.channel_id}-{task_id}",
            type=A2AMessageType.REQUEST,
            sender=sender, recipient=recipient, session_id=session_id,
            task_id=task_id, goal=goal, context=context,
        )
        return message

    def send_update(
        self, sender: str, recipient: str, session_id: str,
        task_id: str, progress: float, status: str = "working",
    ) -> A2AMessage:
        """Send a progress update via A2A protocol format."""
        return A2AMessage(
            id=f"{self.channel_id}-update-{task_id}",
            type=A2AMessageType.UPDATE,
            sender=sender, recipient=recipient, session_id=session_id,
            task_id=task_id, status=status, progress=progress,
        )

    def serialize_message(self, message: A2AMessage) -> str:
        """Serialize an A2A message to JSON for transport."""
        return json.dumps(message.to_dict(), default=str)

    def deserialize_message(self, raw_json: str) -> A2AMessage:
        """Deserialize a raw A2A JSON string to typed message object."""
        data = json.loads(raw_json)
        return A2AMessage.from_dict(data)


# Usage: channel = A2AChannel("research-team"); msg = channel.send_request(...)
```

### Pattern 3: Framework Adapter Bridge

```python
"""Thin abstraction layer connecting protocol interfaces to framework-native APIs."""

from abc import ABC, abstractmethod
from typing import Any


class FrameworkAdapter(ABC):
    """Abstract adapter for translating between protocol and framework-native calls."""

    @abstractmethod
    async def invoke_mcp_tool(self, tool_name: str, arguments: dict[str, Any]) -> Any:
        """Adapt MCP tool invocation to the underlying framework's API."""
        ...

    @abstractmethod
    async def send_a2a_message(self, message: A2AMessage) -> None:
        """Adapt A2A message to the underlying framework's agent communication."""
        ...


class LangGraphAdapter(FrameworkAdapter):
    """Adapter for LangGraph-based agent frameworks."""

    async def invoke_mcp_tool(self, tool_name: str, arguments: dict[str, Any]) -> Any:
        from langchain_core.tools import Tool as LangChainTool
        # Map MCP tool call to LangChain RunnableBinding adapter
        langchain_tool = self._resolve_langchain_tool(tool_name)
        return await langchain_tool.ainvoke(arguments)

    async def send_a2a_message(self, message: A2AMessage) -> None:
        from langgraph.types import Command, interrupt
        # Convert A2A request to LangGraph interrupt/command pattern
        if message.type == A2AMessageType.REQUEST:
            interrupt(message.to_dict())

    def _resolve_langchain_tool(self, tool_name: str):
        # Framework-specific tool resolution logic
        raise NotImplementedError


class CrewAIAdapter(FrameworkAdapter):
    """Adapter for CrewAI-based multi-agent frameworks."""

    async def invoke_mcp_tool(self, tool_name: str, arguments: dict[str, Any]) -> Any:
        from crewai import Action  # framework import isolated to adapter
        # Map MCP tool call to CrewAI Action pattern
        action = self._resolve_crewai_action(tool_name)
        return await action.arun(**arguments)

    async def send_a2a_message(self, message: A2AMessage) -> None:
        # CrewAI uses task delegation — translate A2A request to CrewAI task
        ...
```

---

## Constraints

### MUST DO
- Define protocol interfaces (MCP schemas, A2A message types) BEFORE choosing a framework
- Implement MCP tool servers as independent modules runnable outside of any agent framework
- Use JSON Schema for all MCP tool input/output definitions — never use informal type hints alone
- Keep the adapter layer thin and framework-specific only — no business logic in adapters
- Add contract tests that validate every tool against its JSON Schema and every message against A2A format

### MUST NOT DO
- Let framework-specific APIs leak into agent business logic or tool implementations
- Hardcode framework imports (LangChain, CrewAI) outside the adapter layer
- Use raw strings for inter-agent communication — always use typed A2A message classes
- Design communication patterns that depend on a single framework's internal mechanisms

---

## Output Template

When using this skill, produce the following output:

1. **Protocol Interface Specification** — MCP tool schemas and A2A message type definitions as code objects
2. **Architecture Diagram** — ASCII diagram showing protocol boundaries, adapter layer, and framework connection points
3. **Tool Server Implementation** — Complete MCP-compliant tool server with registered tools and handlers
4. **A2A Channel Configuration** — Message types, channel definitions, and communication patterns between agents
5. **Adapter Layer Code** — Framework-specific adapters implementing the abstract protocol bridge
6. **Contract Test Suite** — Schema validation tests and message format compliance checks

## Related Skills

| Skill | Purpose |
|---|---|
| `ai-framework-comparison` | Compare frameworks to select one that works well with your protocol-first design |
| `observability-patterns` | Add tracing and cost tracking across protocol boundaries |
| `framework-utilization` | Learn how to use the selected framework alongside your protocol layer |

## Live References

> Authoritative documentation links for protocol-first agent design.

- [MCP (Model Context Protocol) Specification](https://modelcontextprotocol.io/)
- [A2A (Agent-to-Agent Protocol) — Google](https://github.com/google/a2a)
- [MCP Python SDK Documentation](https://github.com/modelcontextprotocol/python-sdk)
- [LangGraph Integration with MCP](https://langchain-ai.github.io/langgraph/concepts/mcp/)
- [CrewAI Custom Actions Pattern](https://docs.crewai.com/how-to/custom-actions/)
- [JSON Schema Specification](https://json-schema.org/draft/2020-12/json-schema-core)
