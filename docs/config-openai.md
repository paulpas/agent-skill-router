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
# Optional: Auto-Skill Generation
# ─────────────────────────────────────────────────────────────────────────────

AUTO_SKILL_ENABLED=true
AUTO_SKILL_MODEL=gpt-4o-mini
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
