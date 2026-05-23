---
name: anthropic-api
description: Integrates Anthropic Claude API (Messages API, Tool Use, MCP Connector, Computer Use, Batches) using the anthropic Python SDK with streaming and error handling.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: anthropic, claude, claude api, messages api, tool use, mcp connector, how do i use claude api, anthropic bedrock
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, examples, do-dont]
  related-skills: coding-openai-api, coding-aws-bedrock, coding-mcp-protocol
---

# Anthropic Claude API Integration

Integrates Anthropic Claude models (Claude Opus 4, Sonnet 4, Haiku 3.5) using the `anthropic` Python SDK. When loaded, this skill makes the model implement Claude API calls with proper Messages API patterns, tool use (function calling), MCP connector integration, streaming, and error handling.

## When to Use

Use this skill when:

- Building applications that call Anthropic Claude models (Opus, Sonnet, Haiku)
- Implementing tool use / function calling with Claude
- Integrating MCP (Model Context Protocol) servers with the Claude API MCP connector
- Using streaming responses for real-time applications
- Building multi-turn conversations with Claude
- Using platform integrations (Bedrock, Vertex AI, Foundry)
- Implementing Computer Use for desktop automation

---

## When NOT to Use

- For OpenAI models, use `coding-openai-api`
- For hosting Claude on AWS Bedrock, use `coding-aws-bedrock` for Boto3 patterns
- For general MCP server implementation, use `coding-mcp-protocol`

---

## Core Workflow

1. **Initialize the Client** — Create an `Anthropic` client with `api_key` from the `ANTHROPIC_API_KEY` environment variable. Never hardcode keys. **Checkpoint:** Verify initialization by calling `client.messages.create()` with a minimal test message.

2. **Send a Messages Request** — Use `client.messages.create()` with `model`, `max_tokens`, and `messages` (list of role/content dicts). Always set `max_tokens` — Claude does not have a default. **Checkpoint:** Confirm the response contains `content` blocks typed as `text` or `tool_use`.

3. **Implement Tool Use** — Define tools with `name`, `description`, and `input_schema`. Use the `@beta_tool` decorator for automatic schema generation from Python functions. Use `tool_runner()` for automated tool execution loops. **Checkpoint:** Every tool must have typed parameters with descriptions — Claude uses descriptions for tool selection.

4. **Handle Streaming** — Use `stream=True` and iterate over `StreamEvent` objects. Process `content_block_delta` events for incremental text and `content_block_stop` for completed blocks. **Checkpoint:** Verify text arrives incrementally and `message_stop` event fires at completion.

5. **Connect MCP Servers** — Use the `mcp_servers` parameter in `client.beta.messages.create()` to connect to remote MCP servers. Define `type: "url"` servers with authorization tokens. Use `tools: [{"type": "mcp_toolset", "mcp_server_name": "..."}]` to enable tools. **Checkpoint:** Confirm the beta header `mcp-client-2025-11-20` is included when using MCP.

---

## Implementation Patterns

### Pattern 1: Basic Messages API with Error Handling

```python
from __future__ import annotations

from typing import Any

from anthropic import Anthropic, APIError, APIStatusError, APIConnectionError, RateLimitError

# ❌ BAD — no error handling, no max_tokens, hardcoded key
client = Anthropic(api_key="sk-ant-...")
msg = client.messages.create(model="claude-opus-4-7", messages=[{"role": "user", "content": "Hi"}])
print(msg.content[0].text)

# ✅ GOOD — proper error handling, env-based auth, typed response
client = Anthropic()  # reads ANTHROPIC_API_KEY from environment


def ask_claude(
    prompt: str,
    model: str = "claude-sonnet-4-6",
    max_tokens: int = 1024,
    system_prompt: str | None = None,
) -> str:
    """Send a message to Claude and return the text response.

    Args:
        prompt: The user message to send.
        model: Claude model identifier.
        max_tokens: Maximum output tokens (required by Claude API).
        system_prompt: Optional system prompt.

    Returns:
        The text content from Claude's response.

    Raises:
        ValueError: On authentication failure or invalid request.
        ConnectionError: On network or API connectivity issues.
    """
    kwargs: dict[str, Any] = {
        "model": model,
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": prompt}],
    }
    if system_prompt:
        kwargs["system"] = system_prompt

    try:
        response = client.messages.create(**kwargs)
        text_blocks = [b.text for b in response.content if b.type == "text"]
        return "\n".join(text_blocks)
    except APIStatusError as e:
        if e.status_code == 401:
            raise ValueError("Invalid Anthropic API key.") from e
        if e.status_code == 400:
            raise ValueError(f"Bad request: {e.message}") from e
        raise
    except APIConnectionError as e:
        raise ConnectionError("Failed to connect to Anthropic API.") from e
```

### Pattern 2: Tool Use with @beta_tool Decorator

The `@beta_tool` decorator automatically generates the tool schema from the function signature and docstring.

```python
from anthropic import Anthropic, beta_tool

client = Anthropic()


@beta_tool
def get_weather(location: str) -> str:
    """Get current weather for a given location.

    Args:
        location: The city and state, e.g., San Francisco, CA
    Returns:
        A JSON string with the location, temperature, and weather condition.
    """
    import json
    return json.dumps({
        "location": location,
        "temperature": "72°F",
        "condition": "Sunny",
    })


def ask_with_tools(prompt: str) -> list[str]:
    """Ask Claude a question, allowing tool use via the tool runner.

    The tool runner automatically handles the tool-call loop:
    Claude requests a tool → runner executes it → feeds result back.

    Args:
        prompt: The user's question that may require tool use.

    Returns:
        List of text responses from Claude across the conversation.
    """
    runner = client.beta.messages.tool_runner(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        tools=[get_weather],
        messages=[{"role": "user", "content": prompt}],
    )

    responses: list[str] = []
    for message in runner:
        for block in message.content:
            if block.type == "text":
                responses.append(block.text)
    return responses
```

### Pattern 3: Streaming Responses

```python
from __future__ import annotations

from anthropic import Anthropic

client = Anthropic()


def stream_claude(
    prompt: str,
    model: str = "claude-sonnet-4-6",
) -> str:
    """Stream a response from Claude, yielding text incrementally.

    Args:
        prompt: The user message.
        model: Claude model identifier.

    Returns:
        Accumulated full text (also yields partial text during iteration).
    """
    accumulated = ""

    with client.messages.stream(
        model=model,
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        for text_delta in stream.text_stream:
            print(text_delta, end="", flush=True)
            accumulated += text_delta

    return accumulated
```

---

## Constraints

### MUST DO
- Always set `max_tokens` — Claude's Messages API requires it and has no default
- Read API key from `ANTHROPIC_API_KEY` environment variable; never hardcode
- Use the `@beta_tool` decorator for Python-native tool definitions when using the tool runner
- Include the `anthropic-beta: mcp-client-2025-11-20` header when using the MCP connector
- Catch `APIStatusError` (check `e.status_code`), `APIConnectionError`, and `RateLimitError`
- Process streaming responses via `client.messages.stream()` context manager

### MUST NOT DO
- Use the deprecated `mcp-client-2025-04-04` beta header — always use `mcp-client-2025-11-20`
- Use prefill with Claude Opus 4.7, Opus 4.6, Sonnet 4.6, or Mythos Preview (returns 400 error)
- Skip `max_tokens` — the API will reject the request
- Call `client.messages.create()` with `stream=True` and process the response as if it were synchronous

---

## Live References

| Resource | URL |
|----------|-----|
| Anthropic Python SDK | https://pypi.org/project/anthropic/ |
| Claude API Documentation | https://docs.anthropic.com/en/docs |
| Messages API Reference | https://docs.anthropic.com/en/api/messages |
| Tool Use Documentation | https://docs.anthropic.com/en/docs/build-with-claude/tool-use |
| MCP Connector Guide | https://docs.anthropic.com/en/docs/agents-and-tools/mcp-connector |
| Anthropic Python SDK GitHub | https://github.com/anthropics/anthropic-sdk-python |
| Claude Agent SDK for Python | https://github.com/anthropics/claude-agent-sdk-python |

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-openai-api` | OpenAI API for multi-provider LLM coverage |
| `coding-mcp-protocol` | Building MCP servers and clients with the Python SDK |
| `coding-aws-bedrock` | Deploying Claude via Amazon Bedrock with Boto3 |
