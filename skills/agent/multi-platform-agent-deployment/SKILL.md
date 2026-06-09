---
name: multi-platform-agent-deployment
description: Deploys and orchestrates an identical agent across multiple execution environments (CLI, web UI, API, chat platforms) with shared knowledge base and behavioral consistency.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  role: implementation
  scope: infrastructure
  output-format: code
  triggers: multi-platform deployment, agent deployment, CLI web API chatbot, agent adapter, how do i deploy agents to multiple platforms, multi-environment agent
  archetypes: [orchestration]
  anti_triggers:
    - single-platform setup only
    - framework selection decisions
    - debug specific platform errors
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
  related-skills: cli-agent-workflows, gui-agent-interaction, mcp-integration
---

# Multi-Platform Agent Deployment Pattern

Deploys and orchestrates an identical agent across multiple execution environments (CLI, web UI, API, chat platform) with a shared knowledge base and consistent behavior. This skill makes the model design environment-specific adapter layers, configuration synchronization, centralized capability registries, and deployment topology patterns for heterogeneous agent deployments.

## TL;DR Checklist

- [ ] Define the core agent logic as a framework-independent service
- [ ] Create adapter interfaces for each target platform (CLI, Web, API, Chat)
- [ ] Configure shared knowledge base (vector store, graph, memory) accessible by all adapters
- [ ] Implement centralized capability registry with health checks per platform
- [ ] Set up deployment manifests for each environment's infrastructure requirements
- [ ] Add platform-specific runtime health monitoring

---

## When to Use

Use this skill when:

- The same agent needs to serve users through multiple channels (CLI, web dashboard, Slack/Discord bot, REST API)
- Building an enterprise agent that must integrate with existing tools and platforms simultaneously
- You need consistent agent behavior across all interaction surfaces
- Different teams are developing different client applications for the same agent backend

## When NOT to Use

Avoid this skill for:

- Single-channel agents (CLI-only or API-only)
- Platforms where the interaction model is fundamentally different per channel
- Early prototyping before the agent logic is stable enough to warrant multi-platform support
- Agents with platform-specific requirements that can't be abstracted into a common interface

---

## Core Workflow

1. **Core Agent Abstraction** — Extract the agent's core reasoning and tool-use logic into a platform-independent service class. This service takes structured input and produces structured output without any UI concerns. **Checkpoint:** The core service must be testable with pure function calls, no HTTP or TTY dependencies.
2. **Adapter Interface Design** — Define an adapter protocol that each platform implementation must satisfy. The adapter translates platform-specific input (CLI args, HTTP requests, chat messages) into the core agent's input format and converts its output back to the platform format. **Checkpoint:** Every adapter must handle error responses consistently (structured error with code, message, and suggestion).
3. **Shared Knowledge Base Setup** — Configure a centralized knowledge base (vector store for RAG, graph database for tool registry) that all adapters connect to. Each adapter uses the same connection credentials and data source so user queries return identical results regardless of entry point. **Checkpoint:** Verify that the knowledge base is accessible from all deployment environments with consistent latency (< 100ms).
4. **Deployment Topology Selection** — Choose a deployment pattern: centralized (single agent service, multiple adapters) vs federated (independent per-platform deployments with shared config). Centralized is simpler; federated is more resilient to single-point failures. **Checkpoint:** Document the trade-offs of your choice in the deployment manifest.
5. **Configuration Synchronization** — Implement a mechanism for keeping configuration identical across all platform instances. Use environment variables, feature flags, or a config service that all adapters query at startup and periodically refresh. **Checkpoint:** Configuration changes must propagate to all platforms within 60 seconds.
6. **Health Monitoring per Platform** — Deploy health check endpoints for each platform adapter. Monitor response latency, error rates, and token usage per-platform independently. Alert when any platform's metrics deviate from the group average by > 2x. **Checkpoint:** All platform health checks must run every 30 seconds with automatic restart on failure.

---

## Implementation Patterns

### Pattern 1: Platform Adapter Protocol

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class Platform(str, Enum):
    """Supported interaction platforms for the agent."""

    CLI = "cli"
    WEB_UI = "web_ui"
    REST_API = "rest_api"
    CHAT_SLACK = "chat_slack"
    CHAT_DISCORD = "chat_discord"


@dataclass
class AgentRequest:
    """Platform-independent input to the agent."""

    user_id: str
    message: str
    context: dict[str, Any] = field(default_factory=dict)
    session_id: str | None = None


@dataclass
class AgentResponse:
    """Platform-independent output from the agent."""

    text: str
    metadata: dict[str, Any] = field(default_factory=dict)
    error_code: str | None = None
    suggestion: str | None = None


@dataclass
class PlatformError:
    """Structured error response for platform consumption."""

    code: str  # e.g., "RATE_LIMITED", "INVALID_INPUT", "INTERNAL_ERROR"
    message: str
    suggestion: str | None = None


class AgentAdapter(ABC):
    """Protocol that every platform adapter must implement.

    Subclasses translate between platform-specific I/O formats and the
    platform-independent AgentRequest / AgentResponse types so that the
    core agent service never sees HTTP, TTY, or chat-protocol details.
    """

    def __init__(self, core_agent: Any) -> None:
        """Initialize with a reference to the core agent service.

        Args:
            core_agent: The platform-independent agent implementation.
        """
        self._core_agent = core_agent

    @abstractmethod
    def parse_input(self, raw_input: Any) -> AgentRequest:
        """Convert platform-specific input to structured request.

        Args:
            raw_input: Raw data from the platform (string, dict, HTTP body, etc.).

        Returns:
            A fully-formed AgentRequest instance.
        """
        ...

    @abstractmethod
    def format_output(self, response: AgentResponse) -> Any:
        """Convert structured agent output back to platform format.

        Args:
            response: The platform-independent AgentResponse from the core agent.

        Returns:
            Data formatted for the target platform (CLI string, JSON body, etc.).
        """
        ...

    @abstractmethod
    def get_platform_error_response(self, error: PlatformError) -> Any:
        """Convert a structured error to platform-specific format.

        Args:
            error: The structured PlatformError with code and message.

        Returns:
            An error response appropriate for the platform.
        """
        ...

    async def handle_request(self, raw_input: Any) -> Any:
        """Full request lifecycle: parse → execute → format.

        Orchestrates input parsing, core agent execution, and output formatting
        while catching errors at every stage and converting them to structured
        PlatformError responses.

        Args:
            raw_input: Raw data from the platform.

        Returns:
            Platform-formatted response or error output.
        """
        try:
            request = self.parse_input(raw_input)
            response = await self._core_agent.execute(request)
            return self.format_output(response)
        except ValueError as e:
            error = PlatformError(code="INVALID_INPUT", message=str(e))
            return self.get_platform_error_response(error)
        except Exception as e:
            error = PlatformError(
                code="INTERNAL_ERROR",
                message="Agent processing failed. Please retry.",
                suggestion="If the issue persists, contact support.",
            )
            return self.get_platform_error_response(error)
```

### Pattern 2: CLI Adapter Implementation

```python
import sys
import json
from dataclasses import dataclass

from multiplatform.adapters.base import AgentAdapter, AgentResponse, PlatformError


class CLIAdapter(AgentAdapter):
    """Adapter for command-line interface interaction.

    Accepts raw text lines from stdin or JSON objects piped through stdin.
    Outputs formatted strings suitable for terminal display.
    """

    def parse_input(self, raw_input: str) -> AgentRequest:
        """Parse CLI input — either raw text or JSON from stdin.

        If the input starts with '{', attempts a JSON decode and extracts
        user_id, message, context, and session_id fields. Falls back to
        treating the entire string as a plain-text message otherwise.

        Args:
            raw_input: A single line of CLI input.

        Returns:
            An AgentRequest derived from the parsed input.

        Raises:
            ValueError: If JSON is malformed and fallback extraction fails.
        """
        if raw_input.startswith("{"):
            try:
                data = json.loads(raw_input)
                return AgentRequest(
                    user_id=data.get("user_id", "cli"),
                    message=data["message"],
                    context=data.get("context", {}),
                )
            except (json.JSONDecodeError, KeyError):
                # Fall back to raw text
                pass

        return AgentRequest(
            user_id="cli",
            message=raw_input.strip(),
        )

    def format_output(self, response: AgentResponse) -> str:
        """Format output for CLI display.

        Appends metadata as indented key-value pairs when present and
        prefixes error responses with emoji markers for visual clarity.

        Args:
            response: The platform-independent agent response.

        Returns:
            A human-readable string suitable for terminal printing.
        """
        if response.error_code:
            return f"Error [{response.error_code}]: {response.message}\nSuggestion: {response.suggestion}"

        # Pretty-print with metadata
        parts = [response.text]
        if response.metadata:
            parts.append(f"\n--- Metadata ---")
            for key, value in response.metadata.items():
                parts.append(f"  {key}: {value}")
        return "\n".join(parts)

    def get_platform_error_response(self, error: PlatformError) -> str:
        """Format a structured error for CLI display with emoji markers.

        Args:
            error: The structured error with code and message.

        Returns:
            A human-readable error string with suggestion fallback.
        """
        return f"❌ [{error.code}] {error.message}\n💡 {error.suggestion or 'Try again.'}"


# Usage — run the CLI adapter as a stdin loop
if __name__ == "__main__":  # pragma: no cover
    cli = CLIAdapter(my_core_agent)
    for line in sys.stdin:
        result = cli.handle_request(line)
        print(result)
```

### Pattern 3: REST API Adapter with FastAPI

```python
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel


app = FastAPI(title="Agent Service API")


class APIRequest(BaseModel):
    """Schema for incoming agent requests via REST."""

    user_id: str
    message: str
    context: dict[str, Any] = {}
    session_id: str | None = None


class APIResponse(BaseModel):
    """Schema for outgoing agent responses via REST."""

    text: str
    metadata: dict[str, Any] = {}
    error_code: str | None = None
    suggestion: str | None = None


# Set at startup with core agent reference
api_adapter: Any = None  # type: ignore[assignment]


@app.post("/api/v1/agent", response_model=APIResponse)
async def agent_endpoint(request: APIRequest) -> APIResponse:
    """REST endpoint for agent interaction.

    Forwards the deserialized request to the core agent service and returns
    the structured response with metadata.

    Args:
        request: Deserialized APIRequest from the client.

    Returns:
        An APIResponse matching the response model schema.

    Raises:
        HTTPException: On internal agent errors (500).
    """
    try:
        req = AgentRequest(
            user_id=request.user_id,
            message=request.message,
            context=request.context,
            session_id=request.session_id,
        )
        response = await api_adapter._core_agent.execute(req)
        return APIResponse(text=response.text, metadata=response.metadata)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint for load balancers and orchestrators.

    Returns:
        A dictionary with status and platform identifier.
    """
    return {"status": "healthy", "platform": "rest_api"}
```

### Pattern 4: Configuration Synchronization Service

```python
import os
import time
from typing import Any, Callable


class ConfigSyncService:
    """Ensures all platform adapters share identical configuration.

    Loads configuration from the configured source (environment variables by
    default), detects changes on a periodic basis, and notifies registered
    listeners so that every platform instance stays in sync.

    Attributes:
        _config_source: The name of the configuration source to use.
        _listeners: Callbacks invoked when configuration changes are detected.
        _current_config: The most recently loaded configuration snapshot.
    """

    def __init__(self, config_source: str = "environment") -> None:
        """Initialize the synchronization service.

        Args:
            config_source: Source identifier (e.g., 'environment', 'vault', 's3').
        """
        self._config_source = config_source
        self._listeners: list[Callable[[dict[str, Any]], None]] = []
        self._current_config: dict[str, Any] = {}

    def load_config(self) -> dict[str, Any]:
        """Load configuration from the configured source.

        Reads standard environment variables with sensible defaults for common
        agent settings such as model selection, token limits, temperature,
        knowledge base URL, and rate limits.

        Returns:
            A dictionary of configuration key-value pairs.
        """
        return {
            "agent_model": os.getenv("AGENT_MODEL", "gpt-4o"),
            "max_tokens": int(os.getenv("MAX_TOKENS", "4096")),
            "temperature": float(os.getenv("TEMPERATURE", "0.7")),
            "knowledge_base_url": os.getenv("KB_URL", "http://localhost:6333"),
            "rate_limit_per_minute": int(os.getenv("RATE_LIMIT", "60")),
        }

    def register_listener(self, callback: Callable[[dict[str, Any]], None]) -> None:
        """Register a function to be called when config changes are detected.

        The callback receives the new configuration dictionary and is invoked
        for every distinct change while the sync loop is running.

        Args:
            callback: A callable accepting a configuration dict.
        """
        self._listeners.append(callback)

    def start_sync(self, interval_seconds: int = 60) -> None:
        """Periodically check for config changes and notify listeners.

        Runs an infinite loop that polls the configuration source at the given
        interval and triggers listeners when a difference is detected.

        Args:
            interval_seconds: Seconds between each configuration poll.
        """
        while True:
            new_config = self.load_config()
            if new_config != self._current_config:
                self._current_config = new_config
                for listener in self._listeners:
                    listener(new_config)
            time.sleep(interval_seconds)


# Usage — register all adapters as config listeners
if __name__ == "__main__":  # pragma: no cover
    sync = ConfigSyncService("environment")
    sync.register_listener(
        lambda config: print(f"Config updated: {config['agent_model']}")
    )
    sync.start_sync(interval_seconds=30)
```

## Constraints

### MUST DO
1. Design the core agent logic as a completely platform-independent service — no HTTP, CLI, or chat dependencies in the core
2. Implement the adapter protocol consistently across all platforms — error handling must use the same structured format everywhere
3. Use centralized configuration for all shared settings (model, temperature, knowledge base URL) — never hardcode per-platform values
4. Deploy health checks on every platform instance with independent monitoring per channel
5. Set up feature flags in the shared config so you can enable/disable functionality across all platforms simultaneously
6. Test that user queries produce identical core results regardless of which platform they enter through
7. Reference `code-philosophy` (5 Laws of Elegant Defense): early exit on configuration mismatch, fail fast when a platform adapter deviates from the protocol
8. Document the deployment topology decision and its trade-offs in the deployment manifest

### MUST NOT DO
1. Mix platform-specific logic into the core agent service — keep adapters thin and focused on translation only
2. Use different knowledge base URLs per platform — users expect consistent results regardless of entry point
3. Deploy without health checks — multi-platform systems fail silently if you're not monitoring each channel independently
4. Skip configuration synchronization — inconsistent settings between platforms lead to confusing user experiences
5. Hard-code platform-specific error messages in the core service — let adapters format errors for their platform

---

## Output Template

When this skill is active, deliver:

1. **Core agent service** — Platform-independent agent logic with structured I/O types
2. **Adapter implementations** — One adapter per target platform (CLI, Web UI, API, Chat)
3. **Shared knowledge base config** — Connection settings and access patterns for all adapters
4. **Deployment topology diagram** — ASCII art showing the architecture choice and data flow
5. **Configuration sync setup** — Feature flags, environment variables, refresh mechanism
6. **Health monitoring config** — Per-platform health check endpoints and alerting thresholds

---

## Related Skills

| Skill | Purpose |
|---|---|
| `cli-agent-workflows` | The CLI adapter is an implementation of this skill's patterns |
| `gui-agent-interaction` | Web UI deployment uses GUI interaction concepts for the frontend |
| `mcp-integration` | MCP servers can serve as the centralized knowledge base |

> 📖 skill(local cache): cli-agent-workflows, gui-agent-interaction, mcp-integration
