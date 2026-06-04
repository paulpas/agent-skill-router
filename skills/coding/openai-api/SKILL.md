---
name: openai-api
description: Integrates OpenAI API (GPT-5, Responses API, Embeddings, DALL-E 3, Whisper,
  Realtime) using the openai Python SDK v2.38+ with proper error handling and async
  patterns.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: coding
  triggers: openai, gpt-5, responses api, chat completions, function calling, openai
    embeddings, how do i use the openai api, text-embedding-3-large
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
  related-skills: coding-anthropic-api, coding-azure-openai, coding-langchain
---
# OpenAI API Integration

Integrates OpenAIs GPT-5, GPT-5-mini, GPT-5-nano, GPT-4o, and embedding models using the `openai` Python SDK (v2.38+). When loaded, this skill makes the model implement OpenAI API calls with proper client initialization, error handling, streaming, async patterns, and the new Responses API.

## When to Use

Use this skill when:

- Building applications that call OpenAI chat, completion, embedding, image generation, or transcription APIs
- Implementing function calling / tool use with OpenAI GPT models
- Working with the Responses API (recommended for GPT-5+ models)
- Integrating OpenAI embeddings for vector search or RAG pipelines
- Handling streaming responses, async clients, or batch processing
- Implementing structured outputs with JSON schema responses

---

## When NOT to Use

- For Azure OpenAI deployments, use `coding-azure-openai` instead
- For Anthropic Claude API, use `coding-anthropic-api`
- For multi-provider orchestration, use `coding-langchain`

---

## Core Workflow

1. **Initialize the Client** — Create an `OpenAI` client using environment variables. Never hardcode API keys. Use the constructor without arguments when `OPENAI_API_KEY` is set in the environment. **Checkpoint:** Verify the client initializes without errors by calling `client.models.list()` on startup.

2. **Select the API** — Use the **Responses API** (`client.responses.create()`) for GPT-5+ and new models. Use **Chat Completions** (`client.chat.completions.create()`) for older models (GPT-4o and earlier). The Responses API is the recommended path forward and supports tools, web search, file search, and computer use. **Checkpoint:** Confirm the model supports your chosen API by checking the model's capability matrix.

3. **Send a Request with Error Handling** — Wrap every API call in a try/except block catching `openai.APIError`, `openai.APIConnectionError`, `openai.RateLimitError`, and `openai.AuthenticationError`. Implement exponential backoff for rate limits. **Checkpoint:** Test error paths by using an invalid API key to verify error handling works.

4. **Handle Streaming** — For streaming, use `stream=True` and iterate over the stream events. For Responses API streaming, iterate `response.output_text` progressively. For Chat Completions streaming, accumulate chunks from `response.choices[0].delta.content`. **Checkpoint:** Verify streaming produces content incrementally, not all at once.

5. **Implement Tool/Function Calling** — Define tools as JSON schemas with `name`, `description`, and `input_schema` (or `parameters`). Parse `tool_calls` from the response, execute matching functions, and return results in a follow-up request. **Checkpoint:** Every tool must have at least one required parameter to prevent empty invocations.

---

## Implementation Patterns

### Pattern 1: Responses API (Recommended for GPT-5+)

The Responses API is OpenAIs modern API surface for GPT-5+ models. It supports tools, web search, file search, and computer use.

```python
import os
from openai import OpenAI

# ❌ BAD — hardcoded key, no error handling, uses deprecated pattern
client = OpenAI(api_key="sk-...")
response = client.completions.create(model="gpt-5", prompt="Hello")
print(response.choices[0].text)

# ✅ GOOD — env-based auth, Responses API, typed error handling
from openai import OpenAI
from openai import APIError, APIConnectionError, RateLimitError, AuthenticationError


client = OpenAI()  # reads OPENAI_API_KEY from environment


def generate_response(
    prompt: str,
    system_instruction: str = "",
    model: str = "gpt-5.2",
    max_tokens: int = 1024,
) -> str:
    """Send a prompt via the Responses API with proper error handling.

    Args:
        prompt: The user input to send to the model.
        system_instruction: Optional system-level instruction.
        model: Model identifier (default: gpt-5.2).
        max_tokens: Maximum output tokens.

    Returns:
        The model's response text.

    Raises:
        APIError: On API-side errors.
        APIConnectionError: On network failures.
    """
    try:
        response = client.responses.create(
            model=model,
            instructions=system_instruction or None,
            input=prompt,
            max_output_tokens=max_tokens,
        )
        return response.output_text
    except AuthenticationError as e:
        raise ValueError("Invalid OpenAI API key. Set OPENAI_API_KEY.") from e
    except RateLimitError as e:
        raise RuntimeError("Rate limit exceeded. Implement retry logic.") from e
    except APIConnectionError as e:
        raise ConnectionError("Failed to connect to OpenAI API.") from e
```

### Pattern 2: Chat Completions with Function Calling

```python
from __future__ import annotations

import json
from typing import Any
from openai import OpenAI

client = OpenAI()


def get_weather(location: str) -> dict[str, Any]:
    """Mock weather function for demonstration."""
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
                        "description": "City and state, e.g., San Francisco, CA",
                    }
                },
                "required": ["location"],
            },
        },
    }
]


def chat_with_tools(user_message: str) -> str:
    """Send a message with tool definitions, handle function calls.

    Args:
        user_message: The user's input text.

    Returns:
        The final assistant response after any tool calls are resolved.
    """
    messages: list[dict[str, Any]] = [
        {"role": "user", "content": user_message}
    ]

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        tools=TOOLS,
        tool_choice="auto",
    )

    assistant_message = response.choices[0].message

    # Handle tool calls if the model requests them
    if assistant_message.tool_calls:
        messages.append(assistant_message)
        for tool_call in assistant_message.tool_calls:
            if tool_call.function.name == "get_weather":
                args = json.loads(tool_call.function.arguments)
                result = get_weather(**args)
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": json.dumps(result),
                })

        # Send the tool results back for a final response
        final = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            tools=TOOLS,
        )
        return final.choices[0].message.content or ""

    return assistant_message.content or ""
```

### Pattern 3: Embeddings with Batching

```python
from __future__ import annotations

from typing import Any
from openai import OpenAI

client = OpenAI()


def embed_texts(
    texts: list[str],
    model: str = "text-embedding-3-small",
    dimensions: int = 1536,
) -> list[list[float]]:
    """Generate embeddings for a list of texts with batching support.

    Args:
        texts: List of text strings to embed.
        model: Embedding model name.
        dimensions: Output dimension count (smaller = cheaper).

    Returns:
        List of embedding vectors, one per input text.
    """
    response = client.embeddings.create(
        model=model,
        input=texts,
        dimensions=dimensions,
    )
    # Sort by index to maintain input order
    sorted_data = sorted(response.data, key=lambda x: x.index)
    return [item.embedding for item in sorted_data]


# Batch large lists to avoid token limits
def embed_in_batches(
    texts: list[str],
    batch_size: int = 100,
    model: str = "text-embedding-3-small",
) -> list[list[float]]:
    """Embed texts in batches to stay within API limits.

    Args:
        texts: Full list of texts to embed.
        batch_size: Max texts per API call.
        model: Embedding model name.

    Returns:
        Concatenated list of embedding vectors.
    """
    all_embeddings: list[list[float]] = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        batch_embeddings = embed_texts(batch, model=model)
        all_embeddings.extend(batch_embeddings)
    return all_embeddings
```

---

## Constraints

### MUST DO
- Always read `OPENAI_API_KEY` from environment variables; never hardcode keys in source files
- Catch `openai.APIError` and its subclasses (`RateLimitError`, `AuthenticationError`, `APIConnectionError`) for every API call
- Use the Responses API (`client.responses.create()`) for GPT-5+ and all new models
- Implement exponential backoff with jitter for rate-limited requests
- Set `max_output_tokens` (Responses API) or `max_tokens` (Chat Completions) on every request

### MUST NOT DO
- Use `openai.Completion` (v0.x API) — always use the v1+ client constructor pattern
- Hardcode API keys in code or commit them to version control
- Swallow exceptions with bare `except:` — always catch specific error types
- Skip `dimensions` parameter when calling embeddings with `text-embedding-3-large` or `text-embedding-3-small` (defaults to full size, which may be unnecessarily expensive)
- Use `seed` parameter with Responses API — it is not supported

---

## Live References

| Resource | URL |
|----------|-----|
| OpenAI Python SDK (PyPI) | https://pypi.org/project/openai/ |
| OpenAI API Reference | https://platform.openai.com/docs/api-reference |
| OpenAI Models Documentation | https://platform.openai.com/docs/models |
| Responses API Guide | https://platform.openai.com/docs/api-reference/responses |
| Chat Completions API | https://platform.openai.com/docs/api-reference/chat |
| Embeddings API | https://platform.openai.com/docs/api-reference/embeddings |
| OpenAI Python SDK GitHub | https://github.com/openai/openai-python |

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-anthropic-api` | Anthropic Claude API integration for alternative LLM provider |
| `coding-azure-openai` | Azure OpenAI deployments with OpenAI SDK compatibility |
| `coding-langchain` | Higher-level LLM orchestration with LangChain agents |
| `coding-gemini-api` | Google Gemini API for multi-provider coverage |
