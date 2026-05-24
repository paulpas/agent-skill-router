# LLM Provider Configuration Guides

This directory contains configuration documentation for the various LLM providers supported by the Skill Router.

## Available Guides

### 1. [OpenAI Provider Configuration](config-openai.md)

Configure the Skill Router to use OpenAI's LLM and embedding models.

- **Default LLM Model**: `gpt-4o-mini`
- **Default Embedding Model**: `text-embedding-3-small`
- **API Key Setup**: Includes instructions for obtaining your OpenAI API key
- **Complete configuration example** with all options

[Read the OpenAI configuration guide →](config-openai.md)

---

### 2. [Anthropic Provider Configuration](config-anthropic.md)

Configure the Skill Router to use Anthropic's Claude models.

- **Default LLM Model**: `claude-4-sonnet`
- **Default Embedding Model**: `claude-embeddings-2`
- **Embedding model details**: Explanation of the `claude-embeddings-2` model
- **API endpoint examples** for both LLM and embeddings

[Read the Anthropic configuration guide →](config-anthropic.md)

---

### 3. [Self-Hosted LLM Configuration](config-litellm-vllm.md)

Configure the Skill Router to use self-hosted LLM providers like vLLM, LiteLLM, and Ollama.

- **Supported providers**: vLLM, LiteLLM, Ollama, Text Generation WebUI
- **Native embeddings**: OpenAI (text-embedding-3-small with 1536 dimensions) or local llama.cpp embeddings
- **Performance considerations**: Speed comparison and optimization tips

[Read the self-hosted configuration guide →](config-litellm-vllm.md)

---

## Quick Start

### For OpenAI (Default)

```bash
# In install-skill-router.conf
OPENAI_API_KEY=sk-your-api-key-here
LLM_PROVIDER=openai
EMBEDDING_PROVIDER=openai
```

### For Anthropic

```bash
# In install-skill-router.conf
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
LLM_PROVIDER=anthropic
EMBEDDING_PROVIDER=anthropic
```

### For Self-Hosted (vLLM, Ollama, etc.)

```bash
# In install-skill-router.conf
OPENAI_BASE_URL=http://localhost:8000/v1
OPENAI_API_KEY=dummy
LLM_PROVIDER=openai
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small
```

## Choosing the Right Provider

| Provider | Best For | Cost | Privacy | Setup |
|----------|----------|------|---------|-------|
| **OpenAI** | Easy setup, reliability | Pay-per-use | External | Simple |
| **Anthropic** | Claude models, safety | Pay-per-use | External | Simple |
| **Self-Hosted** | Privacy, cost savings, custom models | One-time setup | Internal | Complex |

## Related Documentation

- [Full Installation Guide](../README.md#installation)
- [API Documentation](../API.md)
- [Architecture Overview](../ARCHITECTURE.md)
- [Advanced Routing System](../AGENTS.md#advanced-routing-system-v2) — Hybrid scoring, archetypes, MMR, anti-triggers, and score explanations

## Need Help?

1. Check the [FAQ.md](../FAQ.md) for common questions
2. Review the [API.md](../API.md) for endpoint details
3. Visit the [Agent MCP documentation](../AGENT-MCP.md) for advanced configuration
