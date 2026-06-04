---
name: mistral-api
description: Integrates Mistral AI API (Chat, Embeddings, Function Calling, Codestral,
  Agents) using the mistralai Python SDK for LLM and code generation applications.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: coding
  triggers: mistral, mistral ai, mistral api, codestral, mistral chat, mistral embeddings,
    how do i use mistral, le chat
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
  content-types:
  - code
  - guidance
  - examples
  - do-dont
  related-skills: coding-openai-api, coding-cohere-api, coding-langchain
---
# Mistral AI API Integration
Integrates Mistral AI API using the `mistralai` Python SDK for chat completions, embeddings, function calling, code generation (Codestral), and agent building. When loaded, this skill makes the model implement Mistral API calls with proper authentication, streaming, and error handling.

## Core Workflow

1. **Initialize the Client:** Create a `MistralClient()` (sync) or `MistralAsyncClient()` (async) with the API key from the `MISTRAL_API_KEY` environment variable. The SDK provides typed request/response models with Pydantic. **Checkpoint:** Verify by listing models with `client.list_models()`.  
2. **Send a Chat Completion:** Use `client.chat()` with `model` (e.g., `"mistral-large-latest"`), `messages` (list of role/content dicts), and optional `temperature` and `max_tokens`. Mistral supports system, user, and assistant roles. **Checkpoint:** Verify `response.choices[0].message.content` is non-empty.  
3. **Implement Function Calling:** Define tools with `type: "function"` containing name, description, and `parameters` JSON schema. Pass them to `client.chat()` with `tools` parameter. Handle `tool_calls` in the response and return results via additional messages. **Checkpoint:** Check `response.choices[0].finish_reason` — `"tool_calls"` means the model wants to execute tools.  
4. **Generate Embeddings:** Use `client.embeddings()` with `model` (e.g., `"mistral-embed"`) and `input` (string or list of strings). Mistral embeddings produce 1024-dimensional vectors suitable for semantic search and RAG. **Checkpoint:** Verify vector dimensions via `len(embedding)`.  
5. **Generate Code with Codestral:** Use `client.chat()` with the `codestral-latest` model for code generation tasks. Codestral supports fill-in-the-middle via the `codestral` endpoint with `prompt` and `suffix` parameters. **Checkpoint:** For fill-in-the-middle, verify the generated code correctly bridges the prefix and suffix.

---
## Implementation Patterns

### Pattern 1: Chat Completion with Streaming
```python
from __future__ import annotations

from mistralai import Mistral

# ❌ BAD — no error handling, no streaming, no async
from mistralai.client import MistralClient
client = MistralClient(api_key="...")
response = client.chat(model="mistral-large-latest", messages=[{"role": "user", "content": "Hi"}])
print(response.choices[0].message.content)

# ✅ GOOD — env-based auth, streaming, typed error handling
client = Mistral()  # reads MISTRAL_API_KEY from environment

def chat(
    prompt: str,
    model: str = "mistral-large-latest",
    temperature: float = 0.7,
) -> str:
    """Send a chat message and get a complete response.

    Args:
        prompt: User message.
        model: Mistral model identifier.
        temperature: Sampling temperature (0.0 to 1.0).

    Returns:
        The model's response text.

    Raises:
        ValueError: On authentication errors.
        RuntimeError: On API failures.
    """
    try:
        response = client.chat.complete(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
        )
        return response.choices[0].message.content
    except Exception as e:
        error_str = str(e)
        if "401" in error_str or "unauthorized" in error_str.lower():
            raise ValueError("Invalid Mistral API key.") from e
        raise RuntimeError(f"Mistral API error: {e}") from e


def chat_stream(
    prompt: str,
    model: str = "mistral-large-latest",
) -> str:
    """Stream a chat response from Mistral.

    Args:
        prompt: User message.
        model: Mistral model identifier.

    Returns:
        Accumulated response text.
    """
    accumulated = ""
    stream = client.chat.stream(
        model=model,
        messages=[{"role": "user", "content": prompt}],
    )
    for chunk in stream:
        if chunk.data.choices[0].delta.content:
            content = chunk.data.choices[0].delta.content
            print(content, end="", flush=True)
            accumulated += content
    return accumulated
```

### Pattern 2: Function Calling
```python
from __future__ import annotations

from typing import Any
from mistralai import Mistral

client = Mistral()

def get_weather(location: str) -> dict[str, Any]:
    """Mock weather function."""
    return {"location": location, "temperature": 72, "condition": "sunny"}


TOOLS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get current weather for a location",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "City name, e.g., Paris",
                    }
                },
                "required": ["location"],
            },
        },
    }
]

def ask_with_tools(prompt: str) -> str:
    """Ask a question with tool use capabilities.

    Args:
        prompt: User's question that may require function calling.

    Returns:
        Final response after any tool calls are resolved.
    """
    messages: list[dict[str, Any]] = [
        {"role": "user", "content": prompt}
    ]

    response = client.chat.complete(
        model="mistral-large-latest",
        messages=messages,
        tools=TOOLS,
        temperature=0,
    )

    assistant = response.choices[0].message

    if assistant.tool_calls:
        messages.append({
            "role": "assistant",
            "content": assistant.content,
            "tool_calls": assistant.tool_calls,
        })

        for tc in assistant.tool_calls:
            if tc.function.name == "get_weather":
                import json
                args = json.loads(tc.function.arguments)
                result = get_weather(**args)
                messages.append({
                    "role": "tool",
                    "name": "get_weather",
                    "content": json.dumps(result),
                    "tool_call_id": tc.id,
                })

        final = client.chat.complete(
            model="mistral-large-latest",
            messages=messages,
            tools=TOOLS,
        )
        return final.choices[0].message.content

    return assistant.content
```

### Pattern 3: Embeddings
```python
from __future__ import annotations

from mistralai import Mistral

client = Mistral()

def embed_texts(
    texts: list[str],
    model: str = "mistral-embed",
) -> list[list[float]]:
    """Generate embeddings for a list of texts.

    Args:
        texts: List of text strings to embed.
        model: Embedding model name.

    Returns:
        List of embedding vectors (1024-dimensional).
    """
    response = client.embeddings.create(
        model=model,
        inputs=texts,
    )
    return [data.embedding for data in response.data]
```

---
## Constraints
### MUST DO
- Read API key from `MISTRAL_API_KEY` environment variable
- Use the `mistralai` package (v1.0+) with the `Mistral()` constructor
- Use `client.chat.stream()` for streaming responses and `client.chat.complete()` for single responses
- Use `codestral-latest` model for code generation and fill-in-the-middle tasks
- Handle `tool_calls` in the response to support function calling workflows
### MUST NOT DO
- Hardcode API keys in source files
- Use the deprecated `MistralClient(api_key=...)` constructor — use `Mistral()` instead
- Skip temperature setting for function calling (set to 0 for deterministic behavior)
- Use the default model without specifying an explicit model version (use `-latest` or pin a version)
---
## Live References
| Resource | URL |
|----------|-----|
| Mistral AI Python SDK (PyPI) | https://pypi.org/project/mistralai/ |
| Mistral API Documentation | https://docs.mistral.ai/ |
| Mistral API Reference | https://docs.mistral.ai/api/ |
| Mistral Function Calling | https://docs.mistral.ai/capabilities/function-calling/ |
| Codestral Documentation | https://docs.mistral.ai/capabilities/code-generation/ |
| Mistral GitHub | https://github.com/mistralai/client-python |
---
## Related Skills
| Skill | Purpose |
|-------|---------|
| coding-openai-api | Alternative LLM provider |
| coding-cohere-api | Alternative embedding and reranking provider |
| coding-langchain | LangChain integration with Mistral models |