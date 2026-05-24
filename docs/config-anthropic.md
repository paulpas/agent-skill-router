# Anthropic Provider Configuration

This guide explains how to configure the Skill Router to use Anthropic's Claude models (claude-4-sonnet) for LLM and the `claude-embeddings-2` model for embeddings.

## Overview

Anthropic provides access to Claude models through their API, offering:
- **Claude 4 Sonnet** (`claude-4-sonnet`) - High intelligence for complex tasks
- **Embeddings v2** (`claude-embeddings-2`) - Purpose-built embedding model

## Why Anthropic?

Anthropic offers:
- **Claude models** known for nuanced reasoning and safety
- **Competitive pricing** compared to OpenAI
- **Strong embedding model** with excellent semantic quality
- **Transparent usage reporting** in the Anthropic dashboard

## Default Configuration

The Skill Router defaults to:
- **LLM Model**: `claude-4-sonnet` - Anthropic's most capable model for complex reasoning
- **Embedding Model**: `claude-embeddings-2` - Purpose-built for semantic similarity

## Getting Your API Key

1. Visit [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to [API Keys](https://console.anthropic.com/settings/keys)
4. Click "Create Key"
5. Copy the key (starts with `sk-ant-`)

## Configuration File

Create or edit your `install-skill-router.conf` file:

```bash
# Anthropic Provider Configuration
ANTHROPIC_API_KEY=sk-ant-your-api-key-here

# Provider selection
LLM_PROVIDER=anthropic
EMBEDDING_PROVIDER=anthropic

# Model selection
LLM_MODEL=claude-4-sonnet
EMBEDDING_MODEL=claude-embeddings-2
```

## Complete Configuration Example

Here's a complete configuration file for Anthropic:

```bash
# ─────────────────────────────────────────────────────────────────────────────
# Anthropic Provider Configuration
# ─────────────────────────────────────────────────────────────────────────────

# Your Anthropic API key
ANTHROPIC_API_KEY=sk-ant-...

# LLM Provider Selection
LLM_PROVIDER=anthropic
LLM_MODEL=claude-4-sonnet

# Embedding Provider Configuration
EMBEDDING_PROVIDER=anthropic
EMBEDDING_MODEL=claude-embeddings-2

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
AUTO_SKILL_MODEL=claude-4-sonnet
```

## Embedding Model Details

### `claude-embeddings-2`

The `claude-embeddings-2` model is Anthropic's purpose-built embedding model with these characteristics:

- **Dimensionality**: 1024 dimensions
- **Use case**: Semantic similarity, retrieval, and classification
- **Performance**: Optimized for accuracy on retrieval benchmarks
- **Cost**: Competitive pricing per million tokens

### Using Embeddings

The embeddings endpoint accepts text input and returns numerical vectors:

```json
{
  "input": "Your text here",
  "model": "claude-embeddings-2"
}
```

Response:
```json
{
  "embeddings": [
    [0.123, -0.456, 0.789, ...]
  ]
}
```

## Using Custom Models

If you want to use a different Anthropic model:

```bash
# For higher quality responses (claude-4-opus - more expensive)
LLM_MODEL=claude-4-opus

# For faster responses (claude-4-haiku - cheaper)
LLM_MODEL=claude-4-haiku

# Alternative embedding model (if available)
EMBEDDING_MODEL=claude-embeddings-2
```

## Cost Considerations

| Model | Input Cost (per 1M tokens) | Output Cost (per 1M tokens) | Embedding Cost (per 1M tokens) |
|-------|---------------------------|----------------------------|--------------------------------|
| claude-4-sonnet | $3.00 | $15.00 | N/A |
| claude-4-opus | $15.00 | $75.00 | N/A |
| claude-4-haiku | $0.80 | $4.00 | N/A |
| claude-embeddings-2 | N/A | N/A | $0.10 |

**Note**: Embedding costs are separate from LLM costs. The `claude-embeddings-2` model offers good quality at a reasonable price.

## API Key Security

**Never commit your API key to version control!** Use one of these approaches:

1. **Environment variable** (recommended):
   ```bash
   export ANTHROPIC_API_KEY=sk-ant-...
   ./install-skill-router.sh
   ```

2. **Secrets management** (production):
   - Use GitHub Secrets for CI/CD deployments
   - Use a secrets manager like AWS Secrets Manager or HashiCorp Vault

3. **Local file** (development):
   - Store in `install-skill-router.conf` (ignored by git)
   - Never share this file

## Troubleshooting

### Error: "Invalid API key"

**Solution**: Verify your API key is correct and starts with `sk-ant-`. Regenerate the key if needed.

### Error: "Model not found: claude-4-sonnet"

**Solution**: Verify the model name is correct. Anthropic occasionally updates model names. Check the [Anthropic models documentation](https://docs.anthropic.com/en/docs/about-claude/models).

### Error: "Insufficient quota"

**Solution**: Add credits to your Anthropic account or contact Anthropic support to increase your quota.

### Error: "Rate limit exceeded"

**Solution**:
- Wait for your rate limit to reset
- Implement retry logic with exponential backoff
- Contact Anthropic support to increase your rate limit

### Error: "Embedding model not available"

**Solution**: Verify you're using `claude-embeddings-2` as the embedding model name.

## Testing Your Configuration

After configuring, test your setup:

```bash
# Test the Skill Router
docker run --rm \
  -e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
  -e LLM_PROVIDER=anthropic \
  -e EMBEDDING_PROVIDER=anthropic \
  -e LLM_MODEL=claude-4-sonnet \
  -e EMBEDDING_MODEL=claude-embeddings-2 \
  -p 3000:3000 \
  skill-router:latest
```

Then verify the embeddings work:

```bash
# Test embedding endpoint
curl http://localhost:3000/embeddings \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"input": "test query", "model": "claude-embeddings-2"}'
```

## Anthropic API Endpoints Reference

### LLM Endpoint

```bash
curl https://api.anthropic.com/v1/messages \
  -X POST \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-4-sonnet",
    "max_tokens": 1024,
    "messages": [
      {"role": "user", "content": "Hello"}
    ]
  }'
```

### Embeddings Endpoint

```bash
curl https://api.anthropic.com/v1/embeddings \
  -X POST \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-embeddings-2",
    "input": "Your text here"
  }'
```

## Related Documentation

- [Full Installation Guide](../README.md#installation)
- [OpenAI Provider Configuration](config-openai.md)
- [Self-Hosted LLM Configuration](config-litellm-vllm.md)
- [API Reference](../agent-skill-routing-system/skill-router-api.md)

## Support

For Anthropic-specific issues:
- [Anthropic Documentation](https://docs.anthropic.com/)
- [Anthropic Status Page](https://status.anthropic.com/)
- [Anthropic Community](https://www.anthropic.com/community)
