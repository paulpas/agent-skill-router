---
name: gemini-api
description: Integrates Google Gemini API (Gemini 2.5 Pro/Flash, Function Calling, Vertex AI) using the google-genai Python SDK with content generation, streaming, and grounding.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: gemini, gemini api, vertex ai, google genai, function calling, gemini 2.5 flash, how do i use gemini api, grounding
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, examples, do-dont]
  related-skills: coding-openai-api, coding-anthropic-api, coding-langchain
---

# Google Gemini API Integration

Integrates Google Gemini models (Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini 3 Flash) using the `google-genai` Python SDK. When loaded, this skill makes the model implement Gemini API calls with content generation, function calling, streaming, grounding, and Vertex AI configuration.

## When to Use

Use this skill when:

- Building applications with Google Gemini models via the Gemini Developer API
- Deploying Gemini models on Vertex AI with Google Cloud integration
- Implementing function calling (tool use) with Gemini models
- Using Google Search grounding for factually grounded responses
- Building chat sessions with multi-turn conversation support
- Migrating from the legacy `vertexai` SDK to the new `google-genai` SDK

---

## When NOT to Use

- For OpenAI models, use `coding-openai-api`
- For Anthropic Claude, use `coding-anthropic-api`
- For deploying Gemini via the Vertex AI legacy SDK that is deprecated after June 24, 2026, use the `google-genai` SDK instead

---

## Core Workflow

1. **Initialize the Client** — Create a `genai.Client()` instance. For the Gemini Developer API, use `genai.Client(api_key="...")`. For Vertex AI, use `genai.Client(vertexai=True, project="...", location="...")` or set `GOOGLE_GENAI_USE_VERTEXAI=True` and `GOOGLE_CLOUD_PROJECT`. **Checkpoint:** Verify connectivity by calling `client.models.generate_content()` with a minimal prompt.

2. **Generate Content** — Use `client.models.generate_content()` with `model` (e.g., `"gemini-2.5-flash"`) and `contents`. The SDK supports automatic function calling — Python functions passed as tools are called automatically by default. **Checkpoint:** Check `response.text` or `response.candidates[0].content.parts` for the response.

3. **Implement Function Calling** — Use the `tools` parameter in `GenerateContentConfig` with Python functions or `types.FunctionDeclaration`. For manual control, disable automatic function calling with `automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True)`. **Checkpoint:** Verify that function calls return `types.FunctionCall` parts and the response includes function responses.

4. **Handle Streaming** — Use `client.models.generate_content_stream()` to get an iterable of `GenerateContentResponse` chunks. Accumulate text from `chunk.text` or process `chunk.candidates[0].content.parts` for incremental results. **Checkpoint:** Confirm streaming produces multiple chunks with progressive content.

5. **Implement Grounding** — For Google Search grounding, add `types.GoogleSearchRetrieval` to the tool config. For Vertex AI, enable grounding with the `vertexai` parameter in client config. **Checkpoint:** When grounding is active, verify `response.candidates[0].grounding_metadata` contains search entry points.

---

## Implementation Patterns

### Pattern 1: Basic Content Generation with Error Handling

```python
from __future__ import annotations

from google import genai
from google.genai import types

# ❌ BAD — untyped response handling, no error handling, old SDK pattern
import vertexai
from vertexai.generative_models import GenerativeModel
vertexai.init(project="my-project")
model = GenerativeModel("gemini-2.5-flash")
response = model.generate_content("Hello")
print(response.text)

# ✅ GOOD — google-genai SDK, typed error handling, env-based config
client = genai.Client()  # uses GOOGLE_API_KEY or vertexai=True from env


def generate_content(
    prompt: str,
    model: str = "gemini-2.5-flash",
    temperature: float = 0.7,
) -> str:
    """Generate content using Gemini with proper error handling.

    Args:
        prompt: The user input text.
        model: Gemini model identifier.
        temperature: Sampling temperature (0.0 to 1.0).

    Returns:
        Generated text response.

    Raises:
        ValueError: On API authentication or invalid request errors.
    """
    try:
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=temperature,
            ),
        )
        return response.text
    except Exception as e:
        error_str = str(e)
        if "API_KEY" in error_str or "permission" in error_str.lower():
            raise ValueError("Invalid or missing Gemini API key.") from e
        if "not found" in error_str.lower() and "model" in error_str.lower():
            raise ValueError(f"Model '{model}' not found or not accessible.") from e
        raise RuntimeError(f"Gemini API error: {error_str}") from e
```

### Pattern 2: Function Calling with Automatic Execution

Gemini SDK supports automatic function calling — it will invoke Python functions and feed results back to the model automatically.

```python
from __future__ import annotations

from google import genai
from google.genai import types

client = genai.Client()


def get_current_weather(location: str) -> dict[str, object]:
    """Get the current weather for a location.

    Args:
        location: The city and state, e.g., San Francisco, CA
    Returns:
        Weather data dict with temperature and conditions.
    """
    return {
        "location": location,
        "temperature": 72,
        "condition": "sunny",
        "humidity": 45,
    }


def ask_with_tools(prompt: str) -> str:
    """Send a prompt with function calling tools to Gemini.

    The SDK automatically calls the Python function when the model
    requests it and feeds the result back to complete the response.

    Args:
        prompt: The user's question requiring function calls.

    Returns:
        The model's final response incorporating tool results.
    """
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            tools=[get_current_weather],
            temperature=0,
        ),
    )
    return response.text


# For manual function calling (disable auto-execute):
def ask_with_manual_tools(prompt: str) -> str:
    """Send a prompt with manual function calling control.

    The caller must handle the FunctionCall part and provide results.
    """
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            tools=[get_current_weather],
            automatic_function_calling=types.AutomaticFunctionCallingConfig(
                disable=True
            ),
            temperature=0,
        ),
    )

    # Manual handling of function calls
    for candidate in response.candidates:
        for part in candidate.content.parts:
            if part.function_call:
                fn_name = part.function_call.name
                fn_args = {k: v for k, v in part.function_call.args.items()}
                if fn_name == "get_current_weather":
                    result = get_current_weather(**fn_args)
                    # Send result back in a follow-up
                    # (simplified — production code would build the full exchange)
                    return f"Function {fn_name} returned: {result}"
    return response.text
```

### Pattern 3: Streaming with Chat Sessions

```python
from __future__ import annotations

from google import genai
from google.genai import types

client = genai.Client()


def stream_chat(
    messages: list[dict[str, str]],
    model: str = "gemini-2.5-flash",
) -> str:
    """Stream a chat response from Gemini.

    Args:
        messages: List of {"role": "user"/"model", "content": str} dicts.
        model: Gemini model identifier.

    Returns:
        The accumulated response text.
    """
    contents = [
        types.Content(
            role=msg["role"],
            parts=[types.Part.from_text(text=msg["content"])],
        )
        for msg in messages
    ]

    accumulated = ""
    for chunk in client.models.generate_content_stream(
        model=model,
        contents=contents,
    ):
        if chunk.text:
            print(chunk.text, end="", flush=True)
            accumulated += chunk.text

    return accumulated
```

---

## Constraints

### MUST DO
- Use the `google-genai` package (`pip install google-genai`), not the deprecated `vertexai` SDK for Gemini model access
- Read API keys from `GOOGLE_API_KEY` (Developer API) or set `GOOGLE_GENAI_USE_VERTEXAI=True` (Vertex AI)
- Use `types.GenerateContentConfig` for configuring generation parameters (temperature, tools, etc.)
- Handle API errors by checking error strings for authentication, permission, and model availability issues
- For Vertex AI, set `GOOGLE_CLOUD_PROJECT` and `GOOGLE_CLOUD_LOCATION` environment variables

### MUST NOT DO
- Use the `vertexai.generative_models` module (deprecated after June 24, 2026) — migrate to `google-genai`
- Hardcode API keys or Google Cloud project IDs in source files
- Skip the `temperature` parameter when using function calling (set to 0 for deterministic behavior)
- Assume automatic function calling always succeeds — check `response.candidates[0].finish_reason` for errors

---

## Live References

| Resource | URL |
|----------|-----|
| Google Gen AI SDK (PyPI) | https://pypi.org/project/google-genai/ |
| Python SDK Reference | https://googleapis.github.io/python-genai/ |
| Vertex AI Gemini Docs | https://cloud.google.com/vertex-ai/generative-ai/docs/learn/models |
| Function Calling Guide | https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/function-calling |
| SDK Migration Guide | https://cloud.google.com/vertex-ai/generative-ai/docs/deprecations/genai-vertexai-sdk |
| Google Gen AI GitHub | https://github.com/googleapis/python-genai |

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-openai-api` | OpenAI GPT models for multi-provider coverage |
| `coding-anthropic-api` | Anthropic Claude for multi-provider coverage |
| `coding-langchain` | Cross-provider orchestration with LangChain |
| `coding-aws-bedrock` | AWS-hosted foundation models |
