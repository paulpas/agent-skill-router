# OpenAI Provider Configuration

This guide explains how to configure the Skill Router to use OpenAI's LLM and embedding models.

## Overview

OpenAI is the default provider for the Skill Router, offering reliable LLM and embedding capabilities through the `gpt-4o-mini` and `text-embedding-3-small` models.

## Why OpenAI?

OpenAI provides:
- **Reliable API uptime** with enterprise-grade SLAs
- **Consistent embedding quality** from purpose-built embedding models
- **Fast inference times** for both LLM and embedding requests
- **Easy API key management** through the OpenAI dashboard

## Default Configuration

The Skill Router defaults to:
- **LLM Model**: `gpt-4o-mini` - A cost-effective, high-performance model for most tasks
- **Embedding Model**: `text-embedding-3-small` - Efficient embeddings with 1536 dimensions

## Getting Your API Key

1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to [API Keys](https://platform.openai.com/api-keys)
4. Click "Create new secret key"
5. Copy the key (starts with `sk-`)

## Configuration File

Create or edit your `install-skill-router.conf` file:

```bash
# OpenAI Provider Configuration
OPENAI_API_KEY=sk-your-api-key-here

# Provider selection (default is openai)
LLM_PROVIDER=openai
EMBEDDING_PROVIDER=openai

# Model selection (uses defaults if not specified)
LLM_MODEL=gpt-4o-mini
EMBEDDING_MODEL=text-embedding-3-small
```

## Complete Configuration Example

Here's a complete configuration file for OpenAI:

```bash
# ─────────────────────────────────────────────────────────────────────────────
# OpenAI Provider Configuration
# ─────────────────────────────────────────────────────────────────────────────

# Your OpenAI API key for embeddings and LLM access
OPENAI_API_KEY=sk-proj-...

# LLM Provider Selection
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini

# Embedding Provider Configuration
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small

# ─────────────────────────────────────────────────────────────────────────────
# Networking Configuration
# ─────────────────────────────────────────────────────────────────────────────

PORT=3000

# ─────────────────────────────────────────────────────────────────────────────
# Optional: GitHub Integration
# ─────────────────────────────────────────────────────────────────────────────

GITHUB_ENABLED=true
GITHUB_TOKEN=

# ─────────────────────────────────────────────────────────────────────────────
# Optional: Auto-Skill Generation (Basic)
# ─────────────────────────────────────────────────────────────────────────────

AUTO_SKILL_ENABLED=true         # Enable/disable auto-skill generation tool
AUTO_SKILL_CONTRIBUTE=true      # Enable/disable contribution to git (creates PRs)
AUTO_SKILL_MODEL=gpt-4o-mini    # LLM model used for skill generation
AUTO_SKILL_CREATION_ENABLED=true  # Auto-create skills when no good match exists

# ─────────────────────────────────────────────────────────────────────────────
# Optional: Auto-Skill Creation Advanced (Optional)
# ─────────────────────────────────────────────────────────────────────────────

# Minimum routing confidence threshold for auto-skill creation (default: 0.35).
# When no skill matches above this confidence, the router may auto-create one.
# Range: 0.0–1.0. Lower values trigger more frequent creation attempts.
# AUTO_SKILL_CONFIDENCE_THRESHOLD=0.35

# Maximum LLM retry attempts when skill generation fails (default: 3)
# Applies to both manual and auto-skill generation. Range: 1–10.
# AUTO_SKILL_MAX_RETRIES=3

# ─────────────────────────────────────────────────────────────────────────────
# Semantic Routing (Optional)
# ─────────────────────────────────────────────────────────────────────────────

# Enable/disable semantic skill selection (vector embeddings + BM25 scoring).
# Set to false for deterministic BM25-only routing when embeddings are unavailable.
SEMANTIC_SKILL_SELECTION=true
```

## Using Custom Models

If you want to use a different OpenAI model:

```bash
# For higher quality responses (more expensive)
LLM_MODEL=gpt-4o

# For lower cost embeddings
EMBEDDING_MODEL=text-embedding-3-small

# For higher quality embeddings (larger, more expensive)
EMBEDDING_MODEL=text-embedding-3-large

# Legacy model (deprecated but still available)
LLM_MODEL=gpt-4-turbo
```

## Embedding Emulation Mode (`emulation`)

When running the Skill Router with OpenAI as the LLM provider, you can also use **embedding emulation** via any OpenAI-compatible endpoint. This sends a prompt template to an LLM and parses numerical output as embedding vectors — useful when you don't have access to a dedicated embedding model:

```bash
# Use the same OpenAI key for both LLM and emulation embeddings
EMBEDDING_PROVIDER=emulation
OPENAI_API_KEY=sk-proj-...
EMBEDDING_DIMENSIONS=64              # Default dimensionality (8–3072 supported)
EMBEDDING_PROMPT_TEMPLATE="Output a JSON array of {{dimensions}} floats representing: {{text}}"
```

The emulation mode uses the configured `LLM_MODEL` endpoint to generate embeddings. While slower than native embedding APIs, it works with any OpenAI-compatible LLM and avoids needing a separate embedding model API key.

## Token Tracking for Auto-Skill Creation

When auto-skill creation is enabled (`AUTO_SKILL_CREATION_ENABLED=true`), the router tracks token usage for generated skills:

- **Input tokens**: Context provided to the generation LLM (skill format spec, query description)
- **Output tokens**: Generated SKILL.md content and validation feedback
- **Token limits**: Each generation attempt respects the model's context window; failures are retried up to `AUTO_SKILL_MAX_RETRIES` times

Monitor token usage in the router logs. High auto-skill creation frequency (`AUTO_SKILL_CONFIDENCE_THRESHOLD=0.25`) can significantly increase token consumption.

## Cost Considerations

| Model | Input Cost (per 1M tokens) | Output Cost (per 1M tokens) | Embedding Cost (per 1M tokens) |
|-------|---------------------------|----------------------------|--------------------------------|
| gpt-4o-mini | $0.15 | $0.60 | N/A |
| gpt-4o | $5.00 | $15.00 | N/A |
| text-embedding-3-small | N/A | N/A | $0.02 |
| text-embedding-3-large | N/A | N/A | $0.13 |

**Note**: Embedding costs are separate from LLM costs. Most skill routing operations use embeddings heavily, so consider the `text-embedding-3-small` for cost efficiency.

## API Key Security

**Never commit your API key to version control!** Use one of these approaches:

1. **Environment variable** (recommended):
   ```bash
   export OPENAI_API_KEY=sk-...
   ./install-skill-router.sh
   ```

2. **Secrets management** (production):
   - Use GitHub Secrets for CI/CD deployments
   - Use a secrets manager like AWS Secrets Manager or HashiCorp Vault

3. **Local file** (development):
   - Store in `install-skill-router.conf` (ignored by git)
   - Never share this file

## Troubleshooting

### Error: "Incorrect API key provided"

**Solution**: Verify your API key is correct and starts with `sk-`. Regenerate the key if needed.

### Error: "Insufficient funds"

**Solution**: Add credits to your OpenAI account or switch to a lower-cost model like `gpt-4o-mini`.

### Error: "Rate limit exceeded"

**Solution**: 
- Wait for your rate limit to reset
- Implement retry logic with exponential backoff
- Contact OpenAI support to increase your rate limit

### Error: "Model not found"

**Solution**: Verify the model name is correct. Use `gpt-4o-mini`, `gpt-4o`, or `gpt-4-turbo` for LLM.

## Testing Your Configuration

After configuring, test your setup:

```bash
# Test the Skill Router
docker run --rm \
  -e OPENAI_API_KEY="$OPENAI_API_KEY" \
  -e LLM_PROVIDER=openai \
  -e EMBEDDING_PROVIDER=openai \
  -p 3000:3000 \
  skill-router:latest
```

Then verify the embeddings work:

```bash
# Test embedding endpoint
curl http://localhost:3000/embeddings \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"input": "test query"}'
```

## Related Documentation

- [Full Installation Guide](../README.md#installation)
- [Anthropic Provider Configuration](config-anthropic.md)
- [Self-Hosted LLM Configuration](config-litellm-vllm.md)
- [API Reference](../agent-skill-routing-system/skill-router-api.md)

## Support

For OpenAI-specific issues:
- [OpenAI Documentation](https://platform.openai.com/docs)
- [OpenAI Status Page](https://status.openai.com/)
- [OpenAI Community Forum](https://community.openai.com/)
