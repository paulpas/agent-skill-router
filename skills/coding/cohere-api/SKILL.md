---
name: cohere-api
description: Integrates Cohere API (Generate, Embed, Rerank, Classify, Chat, Tool
  Use) using the cohere Python SDK for NLP, search, and RAG applications.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: cohere, cohere api, cohere embed, cohere rerank, cohere generate, cohere
    chat, how do i use cohere, cohere classify
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
  related-skills: coding-openai-api, coding-mistral-api, coding-pinecone-api, coding-langchain
------
# Cohere API Integration

Integrates Cohere API using the `cohere` Python SDK for embedding, reranking, classification, generation, chat with tool use, and multilingual NLP. When loaded, this skill makes the model implement Cohere API calls with proper authentication, error handling, and batch processing.

## When to Use

Use this skill when:

- Generating embeddings with Cohere's `embed-multilingual-v3.0` or `embed-english-v3.0` for multilingual semantic search
- Reranking search results with Cohere's rerank endpoint for improved RAG accuracy
- Building classification models with Cohere's Classify endpoint (few-shot)
- Using Cohere's Chat API with tool use (function calling) for conversational AI
- Generating text with Cohere's Generate API for content creation
- Building multilingual search applications across 100+ languages
- Implementing command-following models (Command R/R+) for RAG workflows

---

## When NOT to Use

- For OpenAI embeddings and models, use `coding-openai-api`
- For Mistral AI models, use `coding-mistral-api`
- For general-purpose LLM orchestration involving Cohere, use `coding-langchain`

---

## Core Workflow

1. **Initialize the Client** — Create a `cohere.Client()` with the API key from the `CO_API_KEY` environment variable. Never hardcode keys. The v5 SDK provides typed request/response models. **Checkpoint:** Verify connectivity with `client.check_api_key()` which returns a boolean.

2. **Generate Embeddings** — Use `client.embed()` with `texts` (list of strings), `model` (e.g., `"embed-english-v3.0"`), and `input_type` (`"search_document"`, `"search_query"`, `"classification"`, `"clustering"`). V3 embedding models require `input_type` for optimal performance. **Checkpoint:** Verify embedding dimensions match expectations (1024 for v3 english, 384 for multilingual).

3. **Rerank Search Results** — Use `client.rerank()` with a `query`, list of `documents`, and `model`. Reranking is critical for RAG quality — it re-orders retrieved documents by relevance to the query. Optionally set `top_n` to limit results. **Checkpoint:** Verify the reranked results have scores in descending order.

4. **Use Chat with Tool Use** — Use `client.chat()` with `message`, `tools` (tool definitions), and optional `tool_results` to feed back tool outputs. Cohere models support multi-turn tool use for agentic workflows. **Checkpoint:** Check `response.tool_calls` to see if the model requested tool execution.

5. **Classify Text** — Use `client.classify()` with `inputs` and `examples` (few-shot training data). Provide at least 2 examples per class for reliable results. **Checkpoint:** Verify predictions include confidence scores via `prediction.confidence`.

---

## Implementation Patterns

### Pattern 1: Embeddings and Reranking for RAG

```python
from __future__ import annotations

import cohere
from cohere import Client

# ❌ BAD — no input_type for v3 models, no batch handling
co = cohere.Client("api-key")
embeddings = co.embed(texts=["Hello world"], model="embed-english-v3.0").embeddings

# ✅ GOOD — proper input_type, batch processing, error handling
client = cohere.Client()  # reads CO_API_KEY from environment


def embed_documents(texts: list[str], batch_size: int = 96) -> list[list[float]]:
    """Generate embeddings for documents using Cohere v3 models.

    Args:
        texts: List of document texts to embed.
        batch_size: Max texts per API call (Cohere limit: 96).

    Returns:
        List of embedding vectors.

    Raises:
        RuntimeError: On API failures.
    """
    all_embeddings: list[list[float]] = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        response = client.embed(
            texts=batch,
            model="embed-english-v3.0",
            input_type="search_document",
        )
        if response.embeddings is not None:
            all_embeddings.extend(response.embeddings)

    return all_embeddings


def rerank_results(query: str, documents: list[str], top_n: int = 5) -> list[dict]:
    """Rerank documents by relevance to a query.

    Args:
        query: The search query.
        documents: Candidate documents to rerank.
        top_n: Number of top results to return.

    Returns:
        Reranked results with relevance scores.
    """
    response = client.rerank(
        query=query,
        documents=documents,
        model="rerank-english-v3.0",
        top_n=top_n,
    )

    return [
        {
            "index": r.index,
            "document": documents[r.index],
            "relevance_score": r.relevance_score,
        }
        for r in response.results
    ]
```

### Pattern 2: Chat with Tool Use

```python
from __future__ import annotations

from typing import Any
import cohere

client = cohere.Client()

TOOLS: list[dict[str, Any]] = [
    {
        "name": "get_weather",
        "description": "Get the current weather for a city.",
        "parameter_definitions": {
            "location": {
                "description": "City name, e.g., San Francisco, CA",
                "type": "str",
                "required": True,
            }
        },
    }
]


def chat_with_tools(prompt: str) -> str:
    """Send a chat message with tool use capabilities.

    Args:
        prompt: The user's message.

    Returns:
        The assistant's response, potentially after tool execution.
    """
    response = client.chat(
        message=prompt,
        model="command-r-plus",
        tools=TOOLS,
    )

    # Handle tool calls if the model requests them
    if response.tool_calls:
        tool_results: list[dict[str, Any]] = []
        for tc in response.tool_calls:
            if tc.name == "get_weather":
                location = tc.parameters.get("location", "")
                tool_results.append({
                    "call": tc,
                    "outputs": [{"weather": "sunny", "temperature": 72}],
                })

        # Send tool results back for the final response
        final = client.chat(
            message=prompt,
            model="command-r-plus",
            tools=TOOLS,
            tool_results=tool_results,
        )
        return final.text

    return response.text
```

### Pattern 3: Text Classification

```python
from __future__ import annotations

import cohere

client = cohere.Client()


def classify_text(
    inputs: list[str],
    examples: list[dict[str, str]],
) -> list[dict[str, float]]:
    """Classify text using Cohere's few-shot classification.

    Args:
        inputs: Texts to classify.
        examples: List of {"text": str, "label": str} training examples.
                  Provide at least 2 per class.

    Returns:
        List of predictions with label and confidence.
    """
    response = client.classify(
        inputs=inputs,
        examples=[cohere.ClassifyExample(**ex) for ex in examples],
        model="embed-english-v3.0",
    )

    return [
        {"label": pred.prediction, "confidence": pred.confidence}
        for pred in response.classifications
    ]
```

---

## Constraints

### MUST DO
- Read API key from `CO_API_KEY` environment variable
- Use `input_type` parameter with v3 embedding models (`search_document`, `search_query`, `classification`, `clustering`)
- Batch embed calls to stay under the 96-texts-per-call limit
- Use `rerank()` for improving RAG result quality — always rerank before presenting results to the LLM
- Use `check_api_key()` to validate credentials before making other API calls

### MUST NOT DO
- Hardcode API keys in source files
- Skip `input_type` for v3 embedding models — this degrades embedding quality significantly
- Use `client.generate()` when `client.chat()` is more appropriate for conversational use cases
- Skip `top_n` in `rerank()` — the default may return too many results

---

## Live References

| Resource | URL |
|----------|-----|
| Cohere Python SDK (PyPI) | https://pypi.org/project/cohere/ |
| Cohere API Reference | https://docs.cohere.com/reference/about |
| Cohere Embed Documentation | https://docs.cohere.com/docs/embed |
| Cohere Rerank Documentation | https://docs.cohere.com/docs/rerank |
| Cohere Chat with Tools | https://docs.cohere.com/docs/multi-step-tool-use |
| Cohere GitHub | https://github.com/cohere-ai/cohere-python |

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-openai-api` | Alternative embedding and LLM provider |
| `coding-mistral-api` | Alternative embedding and LLM provider |
| `coding-pinecone-api` | Vector database for storing Cohere embeddings |
| `coding-langchain` | LangChain integration with Cohere models |
