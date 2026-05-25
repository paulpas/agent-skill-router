---
name: perplexity-api
description: Integrates Perplexity AI API (Sonar chat completions, online search,
  multi-step queries) using the perplexity-openai Python SDK for real-time web-connected
  LLM responses.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: perplexity, perplexity ai, sonar, perplexity api, perplexity sonar, online
    LLM, how do i use perplexity, real-time search LLM
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
  related-skills: coding-openai-api, coding-anthropic-api, coding-pinecone-api
------
# Perplexity AI API Integration

Integrates Perplexity AI's Sonar API using the `perplexity-openai` Python SDK for real-time web-connected LLM completions. When loaded, this skill makes the model implement Perplexity API calls with proper authentication, streaming, and citation handling for online search-augmented responses.

## When to Use

Use this skill when:

- Building applications that need real-time web-connected LLM answers via Perplexity Sonar
- Implementing research assistants that cite web sources in responses
- Using Perplexity models for up-to-date information (current events, recent news, latest data)
- Building search-enhanced Q&A systems that don't need a separate RAG pipeline
- Using Sonar Pro for complex multi-step search queries with deeper context
- Applications requiring cited responses with source URLs and attribution

---

## When NOT to Use

- For traditional RAG with a vector database, use `coding-pinecone-api` or `coding-weaviate-api`
- For OpenAI GPT models without web search, use `coding-openai-api`
- For Claude models with web search, use `coding-anthropic-api`
- For general-purpose language model tasks that don't need real-time information

---

## Core Workflow

1. **Initialize the Client** — Perplexity Sonar API is OpenAI-compatible. Use the `openai` Python SDK (>=v1.0) with a custom `base_url` of `"https://api.perplexity.ai"` and the API key from the `PERPLEXITY_API_KEY` environment variable. **Checkpoint:** Verify with a simple streaming request — if you get a response, the base URL and key are correct.

2. **Send a Chat Completion** — Use `client.chat.completions.create()` with `model` (e.g., `"sonar-pro"`), `messages` (system+user format), and stream optionally. Perplexity models return `citations` in the response — an array of source URLs. **Checkpoint:** Verify `response.citations` contains relevant source URLs for fact-based queries.

3. **Read Citations** — After receiving a response, process `response.citations` (a list of URL strings). These are the web sources the model referenced. Format them as footnotes or inline references in your output. **Checkpoint:** Verify citations are present and reasonable for the query type (factual vs. creative).

4. **Use Sonar vs Sonar Pro** — Sonar (`"sonar"`) is the standard model for simpler queries. Sonar Pro (`"sonar-pro"`) handles complex, multi-step queries with deeper context. Choose based on task complexity — use Pro for research, Sonar for quick lookups. **Checkpoint:** If the response seems shallow, switch to `sonar-pro`.

5. **Stream Responses** — Use `stream=True` for real-time output. The streaming API is fully OpenAI-compatible, yielding content deltas as chunks. Citations may not be available in every stream chunk — they appear in the final usage metadata. **Checkpoint:** For citation display, collect the full response object rather than parsing the stream chunks.

---

## Implementation Patterns

### Pattern 1: Basic Chat with Citations

```python
from __future__ import annotations

from openai import OpenAI

# ❌ BAD — using default OpenAI endpoint, missing citations
from openai import OpenAI
client = OpenAI()
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Latest AI news?"}],
)
print(response.choices[0].message.content)

# ✅ GOOD — Perplexity base URL, citation extraction, typed error handling
client = OpenAI(
    api_key="",  # read from PERPLEXITY_API_KEY env var
    base_url="https://api.perplexity.ai",
)


def ask_with_citations(
    question: str,
    model: str = "sonar-pro",
    system_prompt: str = "Be precise and cite sources.",
) -> dict:
    """Ask a question and get an answer with web citations.

    Args:
        question: The user's question.
        model: Sonar model (sonar or sonar-pro).
        system_prompt: System instruction for response style.

    Returns:
        Dict with 'answer' (str) and 'citations' (list of str URLs).

    Raises:
        RuntimeError: If the API call fails.
    """
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": question},
            ],
        )

        return {
            "answer": response.choices[0].message.content,
            "citations": getattr(response, "citations", []),
        }
    except Exception as e:
        raise RuntimeError(f"Perplexity API error: {e}") from e


# Usage
result = ask_with_citations("What are the latest developments in AI safety?")
print(f"Answer: {result['answer']}")
print("Sources:")
for i, url in enumerate(result["citations"], 1):
    print(f"  [{i}] {url}")
```

### Pattern 2: Streaming with Citation Metadata

```python
from __future__ import annotations

from openai import OpenAI

client = OpenAI(
    api_key="",
    base_url="https://api.perplexity.ai",
)


def stream_answer(question: str) -> str:
    """Stream a Perplexity response token by token.

    Args:
        question: The user's question.

    Returns:
        Complete answer text.
    """
    response = client.chat.completions.create(
        model="sonar-pro",
        messages=[
            {"role": "system", "content": "You are a research assistant. Cite sources."},
            {"role": "user", "content": question},
        ],
        stream=True,
    )

    accumulated = ""
    for chunk in response:
        delta = chunk.choices[0].delta if chunk.choices else None
        if delta and delta.content:
            content = delta.content
            print(content, end="", flush=True)
            accumulated += content

    return accumulated


def ask_with_citations_verbose(question: str) -> dict:
    """Get answer with citations via non-streaming request.

    This approach is preferred when citations are critical
    because the full response object includes them reliably.

    Args:
        question: The user's question.

    Returns:
        Dict with answer and citations.
    """
    response = client.chat.completions.create(
        model="sonar-pro",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a research assistant. Always cite sources. "
                    "Provide accurate, up-to-date information."
                ),
            },
            {"role": "user", "content": question},
        ],
    )

    return {
        "answer": response.choices[0].message.content,
        "citations": getattr(response, "citations", []),
        "model": response.model,
    }
```

### Pattern 3: Structured Research Query

```python
from __future__ import annotations

from openai import OpenAI

client = OpenAI(
    api_key="",
    base_url="https://api.perplexity.ai",
)


def research_topic(topic: str) -> dict:
    """Perform structured research on a topic using Sonar Pro.

    Args:
        topic: The research topic.

    Returns:
        Structured research results with answer, citations, and summary.
    """
    response = client.chat.completions.create(
        model="sonar-pro",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a research expert. Provide a comprehensive overview. "
                    "Include key facts, recent developments, and notable opinions. "
                    "Cite every factual claim with a source URL."
                ),
            },
            {"role": "user", "content": f"Research the following topic thoroughly: {topic}"},
        ],
    )

    citations: list[str] = getattr(response, "citations", [])

    return {
        "topic": topic,
        "content": response.choices[0].message.content,
        "citations": citations,
        "citation_count": len(citations),
        "model": response.model,
    }
```

---

## Constraints

### MUST DO
- Set `base_url="https://api.perplexity.ai"` when creating the OpenAI client
- Read API key from `PERPLEXITY_API_KEY` environment variable
- Extract `citations` from the response object using `getattr(response, "citations", [])`
- Use `"sonar"` for simple queries and `"sonar-pro"` for complex research
- Format and display citations alongside the answer text for transparency

### MUST NOT DO
- Use the default OpenAI base URL — Perplexity requires `https://api.perplexity.ai`
- Assume citations are always present — use `getattr` with a default empty list
- Stream responses if citations are critical to the application — use non-streaming for reliable citation extraction
- Skip the system prompt — Perplexity models benefit from explicit citation instructions
- Use Sonar Pro for trivial lookups (e.g., "What's the weather?") — it's more expensive and unnecessary

---

## Live References

| Resource | URL |
|----------|-----|
| Perplexity API Documentation | https://docs.perplexity.ai/ |
| Perplexity API Reference | https://docs.perplexity.ai/api-reference/chat-completions |
| Perplexity Sonar Models | https://docs.perplexity.ai/guides/model-guide |
| Perplexity Python Quickstart | https://docs.perplexity.ai/guides/getting-started |
| Perplexity Pricing | https://docs.perplexity.ai/guides/pricing |
| Perplexity Status Page | https://status.perplexity.ai/ |

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-openai-api` | OpenAI-compatible base — same SDK usage pattern |
| `coding-anthropic-api` | Alternative for long-form analysis without live search |
| `coding-pinecone-api` | Vector search for RAG (alternative to Perplexity's built-in search) |
