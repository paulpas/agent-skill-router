---




name: azure-openai
description: Integrates Azure OpenAI Service (GPT deployments, Responses API, Content
  Filters, Entra ID auth, Assistants) using the OpenAI SDK with Azure v1 endpoint
  patterns.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: azure openai, azure openai service, azure gpt, azure responses api, content
    filters, azure openai deployment, how do i use azure openai, microsoft foundry
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
  related-skills: coding-openai-api, coding-aws-bedrock, coding-langchain




---




# Azure OpenAI Service Integration

Integrates Azure OpenAI Service using the `openai` Python SDK with the Azure v1 API endpoint. When loaded, this skill makes the model implement Azure OpenAI calls with proper authentication (API key and Entra ID), the Responses API, content filter handling, and deployment management.

## When to Use

Use this skill when:

- Deploying and calling OpenAI models through Microsoft Azure OpenAI Service
- Using the new Azure OpenAI v1 API (stable, no `api-version` parameter needed)
- Implementing Entra ID (formerly Azure AD) token-based authentication
- Handling Azure OpenAI content filters and responsible AI configurations
- Building with GPT-5+ and newer models that require the Responses API on Azure
- Migrating from `AzureOpenAI()` client to the standard `OpenAI()` client with v1 endpoint
- Working with Azure Foundry model catalog (DeepSeek, Grok, etc. via OpenAI SDK)

---

## When NOT to Use

- For direct OpenAI API usage (not through Azure), use `coding-openai-api`
- For AWS Bedrock, use `coding-aws-bedrock`
- For Azure AI Inference SDK patterns, prefer the OpenAI SDK migration

---

## Core Workflow

1. **Choose Authentication Method** — Use **API key auth** for simplicity: set `AZURE_OPENAI_API_KEY` and `AZURE_OPENAI_ENDPOINT`. Use **Entra ID auth** for production: use `DefaultAzureCredential` and `get_bearer_token_provider`. The v1 API uses the standard `OpenAI()` client, not the deprecated `AzureOpenAI()` constructor. **Checkpoint:** Verify that `base_url` ends with `/openai/v1/` — this is the stable v1 endpoint format.

2. **Check Model Capabilities** — Verify which API your deployed model supports: GPT-5+ requires the Responses API; older models (GPT-4o) work with both Chat Completions and Responses. Use the `migrate.py` script from the `azure-openai-to-responses` tooling to check per-region capability. **Checkpoint:** Confirm the model deployment name (not the model name) is used in the `model` parameter.

3. **Send a Request with the Responses API** — Use `client.responses.create()` with the deployment name as `model`. The Responses API is the recommended surface for GPT-5+ models and provides access to tools, web search, file search, and structured outputs. **Checkpoint:** Handle content filter errors separately — the error body structure differs between Chat Completions (`innererror.content_filter_result`) and Responses (`content_filters[0].content_filter_results`).

4. **Handle Content Filters** — Catch `openai.PermissionDeniedError` for content filter triggers. Access content filter results via `e.body["content_filters"][0]["content_filter_results"]` for the Responses API. **Checkpoint:** Test with a known trigger prompt to verify content filter error handling works.

5. **Optional: Use Foundry AI Project Client** — For advanced agent building, use the `azure-ai-projects` SDK with `AIProjectClient` and `get_openai_client()`. This provides access to Agents, Tools, and MCP integration with Azure Foundry. **Checkpoint:** Verify the project endpoint and model deployment exist in the Foundry project.

---

## Implementation Patterns

### Pattern 1: Basic Azure OpenAI with API Key Auth

```python
from __future__ import annotations

import os

from openai import OpenAI

# ❌ BAD — uses deprecated AzureOpenAI() constructor, requires api_version
from openai import AzureOpenAI
client = AzureOpenAI(
    azure_endpoint="https://my-resource.openai.azure.com",
    api_key="...",
    api_version="2024-12-01-preview",
)
response = client.chat.completions.create(
    model="gpt-4o-deployment",
    messages=[{"role": "user", "content": "Hello"}],
)

# ✅ GOOD — uses standard OpenAI() with v1 endpoint, no api_version needed
client = OpenAI(
    api_key=os.environ["AZURE_OPENAI_API_KEY"],
    base_url="https://my-resource.openai.azure.com/openai/v1/",
)


def generate(
    prompt: str,
    deployment_name: str = "gpt-5.2-chat",
    max_tokens: int = 1024,
) -> str:
    """Generate a response using Azure OpenAI Responses API.

    Args:
        prompt: User input text.
        deployment_name: The Azure deployment name (not the model name).
        max_tokens: Maximum output tokens.

    Returns:
        The model's response text.

    Raises:
        ValueError: On authentication errors.
        RuntimeError: On content filter triggers or API errors.
    """
    try:
        response = client.responses.create(
            model=deployment_name,
            input=prompt,
            max_output_tokens=max_tokens,
        )
        return response.output_text
    except openai.PermissionDeniedError as e:
        # Check for content filter triggers
        body = getattr(e, "body", {})
        if body and "content_filters" in body:
            categories = body["content_filters"][0].get("content_filter_results", {})
            raise RuntimeError(
                f"Content filter triggered: {categories}"
            ) from e
        raise ValueError("Authentication failed. Check API key.") from e
    except openai.APIError as e:
        raise RuntimeError(f"Azure OpenAI API error: {e}") from e
```

### Pattern 2: Entra ID Authentication (Production)

```python
from __future__ import annotations

import os

from azure.identity import DefaultAzureCredential, get_bearer_token_provider
from openai import OpenAI

# ✅ GOOD — Entra ID auth with automatic token refresh
token_provider = get_bearer_token_provider(
    DefaultAzureCredential(),
    "https://ai.azure.com/.default",
)

client = OpenAI(
    base_url="https://my-resource.openai.azure.com/openai/v1/",
    api_key=token_provider,  # type: ignore  # token_provider is callable
)


def generate_with_entra(prompt: str, deployment_name: str) -> str:
    """Generate using Entra ID authentication.

    The token provider handles automatic refresh, so no token management
    is needed in application code.

    Args:
        prompt: User input text.
        deployment_name: Azure deployment name.

    Returns:
        Generated response text.
    """
    response = client.responses.create(
        model=deployment_name,
        input=prompt,
    )
    return response.output_text
```

### Pattern 3: Chat Completions with Non-OpenAI Models

The Azure v1 API also supports third-party models like DeepSeek and Grok via the chat completions endpoint.

```python
from __future__ import annotations

from openai import OpenAI

client = OpenAI(
    api_key=os.environ["AZURE_OPENAI_API_KEY"],
    base_url="https://my-resource.openai.azure.com/openai/v1/",
)


def chat_with_third_party(
    prompt: str,
    deployment_name: str = "DeepSeek-V3.1",
) -> str:
    """Use Azure-hosted third-party models via Chat Completions.

    Args:
        prompt: User input.
        deployment_name: Deployment name for the third-party model.

    Returns:
        Model response text.
    """
    response = client.chat.completions.create(
        model=deployment_name,
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": prompt},
        ],
    )
    return response.choices[0].message.content or ""
```

---

## Constraints

### MUST DO
- Use the standard `OpenAI()` client, not the deprecated `AzureOpenAI()` constructor
- Append `/openai/v1/` to the base URL — this is the stable v1 API endpoint
- Use the **deployment name** (not the model name) as the `model` parameter
- Use Entra ID token authentication for production workloads via `DefaultAzureCredential` and `get_bearer_token_provider`
- Handle content filter errors by checking `e.body["content_filters"]` (Responses API) vs `e.body["innererror"]` (Chat Completions)
- Use `pip install openai>=1.108.1` for Azure v1 API support

### MUST NOT DO
- Use `api_version` parameter with the v1 API — it is not needed and may cause errors
- Use `AzureOpenAI(azure_endpoint=...)` constructor — it is deprecated in `openai>=1.108.1`
- Hardcode Azure resource names, API keys, or tenant IDs in source files
- Skip Entra ID auth for production — API keys lack token refresh and role-based access control

---

## Live References

| Resource | URL |
|----------|-----|
| Azure OpenAI v1 API Guide | https://learn.microsoft.com/en-us/azure/foundry/openai/api-version-lifecycle |
| Azure Responses API Migration | https://github.com/Azure-Samples/azure-openai-to-responses |
| Azure AI Projects SDK | https://learn.microsoft.com/en-us/python/api/overview/azure/ai-projects-readme |
| Azure OpenAI Reference | https://learn.microsoft.com/en-us/azure/ai-services/openai/reference |
| Migrate to OpenAI SDK | https://learn.microsoft.com/en-us/azure/foundry/how-to/model-inference-to-openai-migration |
| OpenAI SDK (PyPI) | https://pypi.org/project/openai/ |

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-openai-api` | Direct OpenAI API patterns (non-Azure) |
| `coding-aws-bedrock` | AWS alternative for foundation model hosting |
| `coding-langchain` | Cross-provider orchestration including Azure OpenAI |
