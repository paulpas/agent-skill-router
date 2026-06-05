# Anthropic Provider Configuration

This guide explains how to configure the Skill Router to use Anthropic's Claude models (claude-3-5-sonnet) for LLM ranking. Embeddings are generated via the configured `EMBEDDING_PROVIDER` (typically OpenAI, llama.cpp, or emulation mode).

## Overview

Anthropic provides access to Claude models through their API, offering:
- **Claude 3.5 Sonnet** (`claude-3-5-sonnet`) - High intelligence for complex reasoning tasks
- **Claude 3.5 Haiku** (`claude-3-5-haiku`) - Fast, cost-effective model

> **Note:** Anthropic models are used exclusively for LLM ranking (skill selection). Embeddings use a separate provider configured via `EMBEDDING_PROVIDER`.

## Why Anthropic?

Anthropic offers:
- **Claude models** known for nuanced reasoning and safety — ideal for skill ranking tasks
- **Competitive pricing** compared to OpenAI, especially at scale
- **Transparent usage reporting** in the Anthropic dashboard
- **Separate embedding control** — pair with any embedding provider (OpenAI, llama.cpp, emulation)

## Default Configuration

The Skill Router defaults to:
- **LLM Provider**: `anthropic` (set via `LLM_PROVIDER=anthropic`)
- **LLM Model**: `claude-3-5-haiku` - Fast and cost-effective for routing decisions
- **Embedding Provider**: Configured separately via `EMBEDDING_PROVIDER=openai` (default)

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

# LLM Provider Selection (Anthropic for ranking)
LLM_PROVIDER=anthropic
LLM_MODEL=claude-3-5-sonnet

# Embedding Provider Configuration (separate from LLM provider)
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small
```

## Complete Configuration Example

Here's a complete configuration file for Anthropic:

```bash
# ─────────────────────────────────────────────────────────────────────────────
# Anthropic Provider Configuration
# ─────────────────────────────────────────────────────────────────────────────

# Your Anthropic API key
ANTHROPIC_API_KEY=sk-ant-...

# LLM Provider Selection (Anthropic for ranking)
LLM_PROVIDER=anthropic
LLM_MODEL=claude-3-5-sonnet

# Embedding Provider Configuration (separate from LLM provider)
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

AUTO_SKILL_ENABLED=true        # Enable/disable auto-skill generation tool
AUTO_SKILL_CONTRIBUTE=true     # Enable/disable contribution to git (creates PRs)
AUTO_SKILL_MODEL=gpt-4o-mini   # LLM model used for skill generation
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

## Embedding Provider (Separate from LLM)

Anthropic models are used exclusively for **LLM ranking** (skill selection). The embedding provider is configured independently via `EMBEDDING_PROVIDER`:

| `EMBEDDING_PROVIDER` | Description | Model Default |
|---|---|---|
| `openai` | OpenAI embeddings API | `text-embedding-3-small` (1536-dim) |
| `llamacpp` | Local llama.cpp embeddings | `local-embedding-model` (1536-dim) |
| `emulation` | LLM-based synthetic embeddings via prompt | `gpt-4o-mini` (64-dim by default) |

### Embedding Emulation Mode (`emulation`)

When running with Anthropic for LLM but without access to an OpenAI-compatible embedding endpoint, you can use **embedding emulation**: the router sends a prompt template to any OpenAI-compatible LLM endpoint and parses the numerical output as an embedding vector.

```bash
# Use any OpenAI-compatible endpoint for embeddings (even Anthropic via LiteLLM)
EMBEDDING_PROVIDER=emulation
OPENAI_BASE_URL=http://localhost:4000/v1  # e.g., LiteLLM proxying Anthropic
OPENAI_API_KEY=dummy
EMBEDDING_DIMENSIONS=64                    # Default, configurable 8–3072
```

The `EMBEDDING_PROMPT_TEMPLATE` variable controls how the LLM is asked to generate embeddings. The default template asks for a JSON array of floats.

## Using Embeddings

Regardless of provider, the embeddings endpoint accepts text input and returns numerical vectors:

```json
{
  "input": "Your text here",
  "model": "text-embedding-3-small"
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
# For highest quality reasoning (more expensive, slower)
LLM_MODEL=claude-3-5-sonnet

# For faster responses (cheaper, good for most routing tasks)
LLM_MODEL=claude-3-5-haiku
```

**Embedding model is configured separately:**
```bash
# Change embedding provider/model independently
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small
# or use emulation mode for local embeddings
EMBEDDING_PROVIDER=emulation
```

## Cost Considerations

| Model | Input Cost (per 1M tokens) | Output Cost (per 1M tokens) |
|-------|---------------------------|----------------------------|
| claude-3-5-sonnet | $3.00 | $15.00 |
| claude-3-5-haiku | $0.80 | $4.00 |

**Note:** The Skill Router uses Anthropic exclusively for LLM ranking (skill selection), which involves relatively short prompts and small outputs per request. Embedding costs are handled by the configured `EMBEDDING_PROVIDER` separately. Most skill routing operations use embeddings heavily, so consider your embedding provider carefully for cost efficiency.

| Embedding Provider | Model | Cost (per 1M tokens) |
|---|---|---|
| OpenAI | `text-embedding-3-small` | $0.02 |
| OpenAI | `text-embedding-3-large` | $0.13 |
| Emulation | Any LLM via prompt template | Depends on underlying model |

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

**Solution**: Anthropic models are used only for LLM ranking. Embeddings use a separate provider — verify your `EMBEDDING_PROVIDER` setting. For OpenAI, use `text-embedding-3-small`. For emulation mode, ensure `OPENAI_BASE_URL` points to a working endpoint.

### Semantic Routing Issues

**Problem**: Queries produce inconsistent or overly generic results.

**Solution**:
- Enable score breakdowns: `DEBUG_ROUTING=true`
- Adjust weights (see [config-reference.md](config-reference.md)):
  - `RETRIEVAL_TRIGGER_MATCH_WEIGHT=0.25` — boost trigger matching
  - `RETRIEVAL_VECTOR_WEIGHT=0.40` — reduce vector weight slightly
- Disable semantic routing for deterministic results: `SEMANTIC_SKILL_SELECTION=false`

### Auto-Skill Creation Issues

**Problem**: Skills are auto-created too frequently or not at all.

**Solution**:
- Adjust confidence threshold: `AUTO_SKILL_CONFIDENCE_THRESHOLD=0.50` (higher = less frequent)
- Check generation logs for retry failures
- Verify the generation model works: `AUTO_SKILL_MODEL=gpt-4o-mini`

## Testing Your Configuration

After configuring, test your setup:

```bash
# Test the Skill Router with Anthropic LLM + OpenAI embeddings
docker run --rm \
  -e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
  -e OPENAI_API_KEY="$OPENAI_API_KEY" \
  -e LLM_PROVIDER=anthropic \
  -e LLM_MODEL=claude-3-5-haiku \
  -e EMBEDDING_PROVIDER=openai \
  -e EMBEDDING_MODEL=text-embedding-3-small \
  -p 3000:3000 \
  skill-router:latest
```

Then verify the embeddings work:

```bash
# Test embedding endpoint
curl http://localhost:3000/embeddings \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"input": "test query", "model": "text-embedding-3-small"}'
```

### Test with Semantic Routing Disabled

For deterministic BM25-only routing (no vector embeddings):

```bash
docker run --rm \
  -e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
  -e LLM_PROVIDER=anthropic \
  -e LLM_MODEL=claude-3-5-haiku \
  -e SEMANTIC_SKILL_SELECTION=false \
  -p 3000:3000 \
  skill-router:latest
```

### Test with Embedding Emulation Mode

When you don't have a dedicated embedding model but have an OpenAI-compatible LLM endpoint:

```bash
docker run --rm \
  -e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
  -e OPENAI_BASE_URL=http://localhost:4000/v1 \
  -e OPENAI_API_KEY=dummy \
  -e LLM_PROVIDER=anthropic \
  -e EMBEDDING_PROVIDER=emulation \
  -p 3000:3000 \
  skill-router:latest
```

## Anthropic API Endpoints Reference

### LLM Endpoint

The Skill Router uses Anthropic's Messages API for LLM ranking:

```bash
curl https://api.anthropic.com/v1/messages \
  -X POST \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-3-5-haiku",
    "max_tokens": 1024,
    "messages": [
      {"role": "user", "content": "Hello"}
    ]
  }'
```

### Embedding Endpoint (via Separate Provider)

Embeddings are generated via the configured `EMBEDDING_PROVIDER`, not Anthropic:

**OpenAI embeddings:**
```bash
curl https://api.openai.com/v1/embeddings \
  -X POST \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "content-type: application/json" \
  -d '{
    "model": "text-embedding-3-small",
    "input": "Your text here"
  }'
```

**Emulation mode (via any OpenAI-compatible endpoint):**
```bash
curl http://localhost:4000/v1/embeddings \
  -X POST \
  -H "Authorization: Bearer dummy" \
  -H "content-type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
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
