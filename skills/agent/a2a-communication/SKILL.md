---
name: a2a-communication
description: Implements Google's Agent-to-Agent (A2A) protocol for cross-framework agent communication using HTTP-based JSON-RPC 2.0 with agent card discovery, SSE streaming, and secure multi-agent interoperability patterns.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  role: implementation
  scope: implementation
  output-format: code
  triggers: A2A, agent to agent, cross-framework communication, JSON-RPC, agent card, SSE streaming, how do i connect agents, Google A2A protocol
  related-skills: multi-agent-collaboration,mcp-integration,routing-patterns
  archetypes:
  - tactical
  - orchestration
  anti_triggers:
  - brainstorming
  - vague ideation
  - single-agent monolith
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
---

# Agent-to-Agent (A2A) Communication Pattern

Implements Google's Agent-to-Agent (A2A) protocol to enable interoperable, cross-framework AI agent communication over HTTP-based JSON-RPC 2.0 — including agent card discovery, streaming updates via SSE, task lifecycle management, and security enforcement for multi-agent workflows.

## TL;DR Checklist

- [ ] Verify the A2A protocol is needed (cross-framework or multi-agent orchestration)
- [ ] Define AgentCard with name, description, url, version, capabilities, skills, and authentication schemes
- [ ] Select discovery strategy: Well-Known URI, curated registry, or direct configuration
- [ ] Choose interaction mechanism: synchronous request/response, async polling, SSE streaming, or push notifications
- [ ] Implement `sendTask` for blocking calls or `sendTaskSubscribe` for streaming connections
- [ ] Enforce security: TLS on all endpoints, authenticate via headers (never in URLs or message bodies)
- [ ] Add audit logging for every inter-agent communication event

---

## When to Use

Use this skill when:

- Building a multi-agent system where agents are created with different frameworks (e.g., Google ADK, LangGraph, CrewAI, AG2, Azure AI Foundry) and must exchange tasks or data
- Designing an enterprise workflow that requires task delegation between specialized agents (e.g., data collection → analysis → report generation)
- Implementing a dynamic information retrieval pattern where a primary agent needs real-time data from a dedicated "data fetching" agent
- Exposing an existing AI agent as an HTTP endpoint for external systems to invoke via the A2A protocol
- Prototyping cross-framework interoperability before committing to a single-agent framework monolith

---

## When NOT to Use

Avoid this skill for:

- Single-framework, single-agent applications — there is no interoperability benefit (use `mcp-integration` instead for tool/context management)
- Low-latency internal calls between tightly coupled services within the same process — use direct function calls or gRPC instead
- Simple request/response APIs with no agent reasoning involved — standard REST endpoints are sufficient
- Situations where a lightweight context protocol is all you need (e.g., passing structured prompts to an LLM) — use MCP rather than the heavier A2A task delegation layer

---

## Core Workflow

1. **Define AgentCard for each agent** — Create a JSON identity document that declares the agent's name, description, URL endpoint, version, streaming capability flag, supported input/output modes, list of named skills (each with id, description, examples, tags), and authentication schemes required. This card is what other agents inspect before initiating communication. **Checkpoint:** Validate every AgentCard contains `name`, `url`, `version`, `capabilities`, and at least one entry in the `skills` array before registering it on any HTTP server.

2. **Choose a discovery strategy** — Select one of three approaches: (a) Well-Known URI — host the AgentCard at `/.well-known/agent.json` for automated, domain-level discovery; (b) Curated Registry — publish cards to a centralized catalog that clients query by capability or tag filters; (c) Direct Configuration — embed card details in config files or share them privately for tightly coupled deployments. **Checkpoint:** If using Well-Known URI, confirm the endpoint returns `Content-Type: application/json` with the full AgentCard JSON. If using a registry, verify search queries support at least capability-based and tag-based filters.

3. **Implement the A2A server endpoint** — Set up an HTTP(S) handler that accepts JSON-RPC 2.0 payloads on the agent's designated URL. Initialize a Runner (agent execution pipeline with artifact, session, and memory services), wrap it in an AgentExecutor, and attach a DefaultRequestHandler that routes incoming `sendTask` and `sendTaskSubscribe` calls through the task lifecycle (submitted → working → completed/failed). **Checkpoint:** Confirm the server responds to `sendTask` with a complete Task object including `status.state`, `taskId`, and `history`. Confirm `sendTaskSubscribe` establishes an SSE connection that emits incremental event streams.

4. **Build the A2A client consumer** — Create a client function that fetches the target agent's Card, resolves authentication credentials from secure storage (environment variables or secret manager), attaches them to request headers, and dispatches JSON-RPC 2.0 messages. For long-running tasks, implement polling with configurable backoff or subscribe to SSE streams for real-time incremental results. **Checkpoint:** After sending a task, verify the response contains a valid `taskId`. If subscribing via SSE, confirm the event stream includes at minimum: `taskStatusUpdate` and `artifactUpdate` events with correct JSON-RPC structure.

5. **Implement security controls** — Enforce TLS 1.2+ on all A2A endpoints (prefer HTTPS). Configure authentication per the AgentCard's declared `authentication.schemes` array — support OAuth 2.0 token exchange or API key injection via `Authorization` headers. Add mutual TLS (mTLS) for enterprise deployments where agent identity verification is required. Record every request and response in an audit log containing: initiating agent id, target agent id, task id, timestamp, and outcome. **Checkpoint:** Verify that no credentials appear in URLs, query parameters, or JSON message bodies. Confirm the audit log captures at least 100% of task submissions and completions with unique identifiers traceable to a single request.

6. **Orchestrate multi-agent workflows** — Chain agents by having the client dispatch sequential tasks across multiple agent endpoints, using `contextId` to preserve conversation state across agent boundaries. For parallel workloads, fan out independent tasks to multiple servers simultaneously and aggregate results before returning to the user. Use the `input-required` task state when an agent needs additional information from the initiating agent or user before proceeding. **Checkpoint:** Validate that each chained task carries the same `contextId`. Verify parallel fan-out completes all branches before merging — no silent failures on any branch should reach the final response.

---

## Implementation Patterns / Reference Guide

### Pattern 1: AgentCard Definition with Structured Skills

An AgentCard is the digital identity and capability manifesto for an A2A-compliant agent. It must be a valid JSON document accessible at the agent's URL. Each skill declares its own input/output modes, examples of usage, and tags for categorization. This structure enables clients to discover capabilities without inspecting source code.

```python
from dataclasses import dataclass, field
from typing import list, Optional


@dataclass
class AgentSkill:
    """Declares a single capability an A2A agent provides."""
    id: str                                    # Unique identifier for this skill (e.g., "get_current_weather")
    name: str                                  # Human-readable display name
    description: str                           # What the skill does, in one sentence
    input_modes: list[str] = field(default_factory=lambda: ["text"])
    output_modes: list[str] = field(default_factory=lambda: ["text"])
    examples: list[str] = field(default_factory=list)  # Sample prompts users might send
    tags: list[str] = field(default_factory=list)     # Categorization keywords

    def to_dict(self) -> dict:
        """Serialize to JSON-compatible dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "inputModes": self.input_modes,
            "outputModes": self.output_modes,
            "examples": self.examples,
            "tags": self.tags,
        }


@dataclass
class AgentCard:
    """Full agent identity document for A2A discovery and interaction."""
    name: str
    description: str
    url: str                                   # Base URL where the agent listens (e.g., "https://agent.example.com/a2a")
    version: str                               # Semantic version string ("1.0.0")
    capabilities: dict = field(default_factory=lambda: {"streaming": False, "pushNotifications": False})
    authentication: Optional[dict] = None      # {"schemes": ["apiKey"]} or None for open access
    default_input_modes: list[str] = field(default_factory=lambda: ["text"])
    default_output_modes: list[str] = field(default_factory=lambda: ["text"])
    skills: list[AgentSkill] = field(default_factory=list)

    def to_dict(self) -> dict:
        """Serialize the full AgentCard for JSON transport."""
        result = {
            "name": self.name,
            "description": self.description,
            "url": self.url,
            "version": self.version,
            "capabilities": self.capabilities,
            "defaultInputModes": self.default_input_modes,
            "defaultOutputModes": self.default_output_modes,
        }
        if self.authentication:
            result["authentication"] = self.authentication
        if self.skills:
            result["skills"] = [s.to_dict() for s in self.skills]
        return result
```

### Pattern 2: Synchronous Request/Response via `sendTask`

Use this pattern when the remote agent can complete a task quickly (seconds, not minutes). The client sends a single JSON-RPC 2.0 message and blocks until the server returns the final response with a completed task state. This is the simplest interaction mode and requires no polling loop or SSE connection management.

```python
import json
import httpx
from typing import Any


async def send_task_sync(
    agent_url: str,
    api_key: str | None = None,
) -> dict[str, Any]:
    """Send a synchronous task to an A2A agent and return the completed response.

    Args:
        agent_url: Base URL of the target A2A server (e.g., "https://weather.example.com/a2a").
        api_key: Optional API key for agents that require authentication.

    Returns:
        Dictionary containing the full JSON-RPC 2.0 response with task status and result.

    Raises:
        httpx.HTTPStatusError: If the server returns a non-2xx status code.
        TimeoutError: If the server does not respond within 30 seconds.
    """
    headers: dict[str, str] = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    payload = {
        "jsonrpc": "2.0",
        "id": "task-001",
        "method": "sendTask",
        "params": {
            "id": "task-001",
            "sessionId": "session-001",
            "message": {
                "role": "user",
                "parts": [
                    {"type": "text", "text": "What is the exchange rate from USD to EUR?"}
                ],
            },
            "acceptedOutputModes": ["text/plain"],
            "historyLength": 5,
        },
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(agent_url, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()


# ❌ BAD: No timeout, no error handling — hangs forever on a slow or dead agent
async def send_task_broken(agent_url: str) -> dict:
    payload = {"jsonrpc": "2.0", "id": "1", "method": "sendTask"}
    resp = httpx.post(agent_url, json=payload)  # blocking call, no timeout!
    return resp.json()


# ✅ GOOD: Async with explicit timeout, status code validation, and structured error message
async def send_task_with_guard(agent_url: str, *, api_key: str | None = None) -> dict:
    if not agent_url.startswith("https://"):
        raise ValueError("A2A endpoints MUST use HTTPS for transport security")
    return await send_task_sync(agent_url, api_key=api_key)
```

### Pattern 3: Streaming via `sendTaskSubscribe` with SSE

Use this pattern when the remote agent processes long-running work or produces incremental results (e.g., multi-step reasoning, large data processing, live monitoring). The client subscribes once and receives a continuous stream of events — task status updates, partial artifacts, and completion notifications — without polling.

```python
import asyncio
from dataclasses import dataclass
from typing import AsyncIterator
import httpx


@dataclass
class StreamEvent:
    """Parsed event from an A2A SSE streaming connection."""
    event_type: str        # "taskStatusUpdate", "artifactUpdate", etc.
    task_id: str           # Which task this update belongs to
    data: dict             # Parsed JSON-RPC 2.0 payload

    def __str__(self) -> str:
        return f"<{self.event_type} task={self.task_id}>"


async def subscribe_to_agent(
    agent_url: str,
    message_text: str,
    api_key: str | None = None,
) -> AsyncIterator[StreamEvent]:
    """Subscribe to a streaming SSE connection and yield incremental results.

    Establishes a persistent one-way connection from the A2A server to this client,
    allowing the remote agent to continuously push status changes and partial results
    without the client needing to make repeated polling requests.

    Args:
        agent_url: Base URL of the target A2A server.
        message_text: User message to process as a streaming task.
        api_key: Optional API key for authenticated agents.

    Yields:
        StreamEvent objects for each SSE event received on the connection.
    """
    headers: dict[str, str] = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    payload = {
        "jsonrpc": "2.0",
        "id": "task-stream-001",
        "method": "sendTaskSubscribe",
        "params": {
            "id": "task-stream-001",
            "sessionId": "session-001",
            "message": {
                "role": "user",
                "parts": [{"type": "text", "text": message_text}],
            },
            "acceptedOutputModes": ["text/plain"],
            "historyLength": 5,
        },
    }

    async with httpx.AsyncClient(timeout=None) as client:
        async with client.stream("POST", agent_url, json=payload, headers=headers) as resp:
            resp.raise_for_status()
            # SSE lines are delimited by double newlines; each event is "data: {...}\n\n"
            async for line in resp.aiter_lines():
                if not line or line == "\r":
                    continue
                if line.startswith("data:"):
                    json_str = line[5:].strip()
                    try:
                        rpc_payload = json.loads(json_str)
                        event_type = rpc_payload.get("params", {}).get(
                            "task", {}
                        ).get("status", {}).get("state", "unknown")
                        task_id = rpc_payload.get("params", {}).get("task", {}).get(
                            "id", "unknown"
                        )
                        yield StreamEvent(event_type=event_type, task_id=task_id, data=rpc_payload)
                    except json.JSONDecodeError:
                        continue


# ❌ BAD: Polling instead of SSE for a task that produces incremental results
async def poll_for_results(agent_url: str, task_id: str) -> dict:
    """Inefficient polling — wastes bandwidth and introduces latency gaps."""
    while True:
        resp = httpx.post(agent_url, json={"jsonrpc": "2.0", "method": "getTaskStatus"})
        data = resp.json()
        if data.get("completed"):
            return data
        await asyncio.sleep(5)  # arbitrary delay — either too fast (spam) or too slow (lag)


# ✅ GOOD: SSE stream with structured event parsing and graceful disconnect
async def consume_stream(agent_url: str, message_text: str) -> list[str]:
    """Collect all streamed results into a single accumulated output string."""
    collected_parts: list[str] = []
    async for event in subscribe_to_agent(agent_url, message_text):
        if "text" in str(event.data):
            collected_parts.append(str(event.data))
        # Check for terminal states to stop listening
        if event.event_type in ("completed", "failed"):
            break
    return "\n".join(collected_parts)
```

### Pattern 4: Agent Discovery — Well-Known URI Resolution

Implement automatic agent discovery by fetching the AgentCard from the standardized Well-Known URI path (`/.well-known/agent.json`) on the target domain. This enables zero-configuration client setup — agents advertise themselves and clients discover capabilities dynamically at runtime.

```python
import asyncio
import httpx
from typing import Optional


async def discover_agent(domain: str, *, timeout: float = 10.0) -> Optional[dict]:
    """Discover an agent's capabilities by fetching its AgentCard from the Well-Known URI.

    The A2A protocol standardizes agent card discovery at /.well-known/agent.json on the
    agent's domain. This function queries that endpoint and returns the parsed Card JSON,
    or None if no agent is registered at that domain.

    Args:
        domain: The target domain (e.g., "https://weather-service.example.com").
        timeout: Maximum seconds to wait for a response before giving up.

    Returns:
        Parsed AgentCard dictionary if found, None otherwise.
    """
    well_known_url = f"{domain}/.well-known/agent.json"

    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            response = await client.get(well_known_url)
            response.raise_for_status()
        except (httpx.HTTPStatusError, httpx.ConnectError):
            return None  # No agent card available — agent may not exist or discovery is disabled

    card = response.json()
    # Validate required fields are present
    required_fields = {"name", "url", "version"}
    missing = required_fields - set(card.keys())
    if missing:
        raise ValueError(f"AgentCard at {well_known_url} is missing required fields: {missing}")

    return card


async def resolve_agent_capabilities(domain: str) -> dict:
    """Fetch agent card and extract its supported interaction mechanisms.

    Args:
        domain: Agent's base URL (e.g., "https://calendar-agent.internal/a2a").

    Returns:
        Dictionary with keys: streaming, push_notifications, available_skills.
    """
    card = await discover_agent(domain)
    if card is None:
        raise ConnectionError(f"No agent card found at {domain}/.well-known/agent.json")

    return {
        "streaming": card.get("capabilities", {}).get("streaming", False),
        "push_notifications": card.get("capabilities", {}).get("pushNotifications", False),
        "available_skills": [s["id"] for s in card.get("skills", [])],
        "requires_auth": bool(card.get("authentication", {}).get("schemes")),
    }
```

---

## Constraints

### MUST DO
- Define every agent's capabilities in an AgentCard with explicit `capabilities.stream`, `skills` list, and `authentication.schemes` before exposing the HTTP endpoint
- Use JSON-RPC 2.0 for all inter-agent payloads — each message must contain `jsonrpc: "2.0"`, a monotonically increasing `id`, a valid `method` name, and properly structured `params`
- Enforce TLS 1.2+ (prefer HTTPS) on every A2A endpoint; reject plain HTTP connections in server startup configuration
- Authenticate agents via HTTP headers (`Authorization: Bearer <token>` or custom API key header) — never embed credentials in URLs, query strings, or JSON message bodies
- Implement audit logging that records initiating agent ID, target agent ID, task ID, timestamp, and outcome for every inter-agent communication
- Support the full task lifecycle states: `submitted`, `working`, `completed`, `failed`, and `input-required` — do not skip any state transitions in your implementation
- Use `contextId` to group related tasks across multiple agent interactions and preserve conversation continuity over task boundaries
- Reference `code-philosophy` laws in constraint design: parse all external JSON-RPC payloads before processing (Law 2), fail fast on malformed messages with descriptive errors (Law 4), and never mutate shared state between concurrent tasks

### MUST NOT DO
- Expose the AgentCard at an unauthenticated endpoint if it contains sensitive internal architecture details — protect with mTLS, network restrictions, or access control lists
- Use `sendTask` for operations expected to take longer than 30 seconds — switch to SSE streaming (`sendTaskSubscribe`) or async polling to avoid client timeouts
- Skip authentication verification on incoming requests — an unprotected A2A endpoint is equivalent to leaving your agent's reasoning pipeline open to any caller
- Hard-code agent URLs in source code — discover them via Well-Known URIs, registries, or externalized configuration that supports environment-specific overrides
- Return raw LLM output without wrapping it in A2A Task/Message/Artifact structures — the protocol requires structured data with parts, attributes, and state metadata
- Bypass task state transitions — do not jump from `submitted` directly to `completed`; intermediate `working` states are required for streaming and monitoring

---

## Output Template

When implementing an A2A communication solution, produce outputs following this structure:

1. **Agent Card Specification** — Complete AgentCard JSON with all declared skills, capabilities flags, authentication requirements, input/output modes, and example prompts for each skill
2. **Discovery Strategy Decision** — Document the chosen discovery method (Well-Known URI / Curated Registry / Direct Configuration) with rationale, endpoint URLs, and fallback behavior
3. **Server Implementation** — HTTP handler code using the A2A protocol with JSON-RPC 2.0 routing for `sendTask` and `sendTaskSubscribe`, Runner/Executor initialization, and task store wiring
4. **Client Implementation** — Async client functions for both synchronous (`send_task_sync`) and streaming (`subscribe_to_agent`) modes, including timeout configuration, retry logic with exponential backoff, and header-based authentication
5. **Security Configuration** — TLS setup details, authentication scheme selection (OAuth 2.0 / API key / mTLS), credential storage mechanism, and audit log schema documenting every request/response pair
6. **Multi-Agent Orchestration Flow** — ASCII diagram or numbered sequence showing how multiple agents are chained via task delegation, with `contextId` propagation across agent boundaries and parallel fan-out aggregation logic

---

## Related Skills

| Skill | Purpose |
|---|---|
| `multi-agent-collaboration` | Broader orchestration patterns for coordinating multiple agents beyond A2A protocol specifics |
| `mcp-integration` | Model Context Protocol — use when you need tool/context structuring rather than task delegation |
| `routing-patterns` | Agent routing and dispatch strategies that complement A2A communication with decision logic |

---

## References

1. Google A2A Samples Repository: https://github.com/google-a2a/a2a-samples
2. Trickle A2A Tutorial: https://www.trickle.so/blog/how-to-build-google-a2a-project
3. Google Agent Discovery: https://a2a-protocol.org/latest/
4. A2A Protocol Specification: https://github.com/a2aproject/a2a
5. O'Reilly — Designing Collaborative Multi-Agent Systems with the A2A Protocol: https://www.oreilly.com/radar/designing-collaborative-multi-agent-systems-with-the-a2a-protocol/

---

## Appendix: A2A vs MCP Decision Matrix

Use this table when deciding between A2A and the Model Context Protocol (MCP) for a given integration scenario:

| Concern | Choose A2A When… | Choose MCP When… |
|---|---|---|
| **Primary goal** | Agents delegate tasks to each other and collaborate on multi-step workflows | An LLM needs structured access to external tools, data sources, or prompts |
| **Communication model** | HTTP-based JSON-RPC 2.0 with async task lifecycles | Tool-calling patterns within a single agent's execution loop |
| **Interoperability scope** | Cross-framework agent-to-agent (ADK ↔ LangGraph ↔ CrewAI) | Same-framework tool integration or LLM-to-resource connections |
| **Task complexity** | Long-running, multi-state tasks with streaming updates | Short-lived, synchronous tool calls (< few seconds each) |
| **Protocol layer** | High-level workflow orchestration and coordination | Low-level context and tool structuring |

**Rule of thumb:** A2A coordinates *who does what* across agents. MCP structures *how an agent accesses tools*. They are complementary — use both when building multi-agent systems that also need rich tool integrations per agent.
