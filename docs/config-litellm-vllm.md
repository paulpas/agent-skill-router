# Self-Hosted LLM Provider Configuration (vLLM, LiteLLM)

This guide explains how to configure the Skill Router to use self-hosted LLM providers like vLLM and LiteLLM with native embedding support.

## Overview

Self-hosted LLM providers offer:
- **Privacy and data control** - Keep your data on-premises
- **Cost savings** - No per-request billing for high-volume usage
- **Custom models** - Run fine-tuned or proprietary models
- **Offline capability** - No internet dependency (when using local models)

## Supported Providers

### vLLM
- High-performance LLM inference server
- Compatible with OpenAI API format
- Great for local or on-prem deployments
- Supports native embeddings via compatible models

### LiteLLM
- Unified API for multiple LLM providers
- Supports OpenAI, Anthropic, Cohere, and more
- Can route to multiple backends
- Supports native embeddings when underlying provider supports it

### Local LLMs
- llama.cpp, Ollama, Text Generation WebUI
- Run models locally on your machine
- No external API calls needed
- Use local embedding models for semantic search

## Configuration for Self-Hosted Endpoints

### Basic Configuration

```bash
# Self-Hosted LLM Configuration
OPENAI_BASE_URL=http://localhost:8000/v1
OPENAI_API_KEY=dummy

# Provider selection
LLM_PROVIDER=openai
EMBEDDING_PROVIDER=openai
```

### Complete Configuration Example

```bash
# ─────────────────────────────────────────────────────────────────────────────
# Self-Hosted LLM Provider Configuration
# ─────────────────────────────────────────────────────────────────────────────

# Your custom LLM endpoint URL
OPENAI_BASE_URL=http://localhost:8000/v1
OPENAI_API_KEY=dummy

# LLM Provider Selection (use 'openai' for OpenAI-compatible endpoints)
LLM_PROVIDER=openai
LLM_MODEL=your-model-name

# Embedding Provider Configuration
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=your-embedding-model

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
AUTO_SKILL_MODEL=your-model-name
```

## Native Embedding Support

The Skill Router uses native OpenAI embedding API or llama.cpp local embedding models for semantic search.

### OpenAI Embeddings
- **Model**: `text-embedding-3-small` (1536-dimensional embeddings)
- **Alternative models**: `text-embedding-3-large`, `text-embedding-ada-002`
- **Performance**: Fast, optimized for semantic similarity

### Local Embeddings (llama.cpp)
- **Dimensionality**: 1536 (configurable via model)
- **Use case**: Private, on-premises deployments
- **Performance**: Fast with local GPU/CPU

### Fallback Behavior
When the configured embedding API is unavailable (e.g., network failure, API key issues), the Skill Router falls back to deterministic hash-based embeddings with 1536 dimensions.

**When this helps:**
- Offline development and testing without API access
- Network failures during embedding generation
- Debugging and troubleshooting scenarios

**Characteristics of fallback embeddings:**
- Deterministic: Same text always produces the same embedding
- Not semantically meaningful: Only useful for exact-match queries
- Configurable dimensions: Default 1536, configurable via environment

**Recommendation:** For production use, ensure your embedding provider is accessible to get semantic similarity-based embeddings.

### Configuration Priority

The Skill Router determines the embedding model using this priority order:

1. **Environment variable**: `EMBEDDING_MODEL` (if set)
2. **Provider default**: 
   - OpenAI: `text-embedding-3-small`
   - llama.cpp: local model configured via endpoint
3. **Provider-specific defaults**: Based on `EMBEDDING_PROVIDER` setting

**Example:**
```bash
# This will use text-embedding-3-small (OpenAI default)
EMBEDDING_PROVIDER=openai
# EMBEDDING_MODEL not set

# This will use a local llama.cpp embedding model
EMBEDDING_PROVIDER=llamacpp
LLAMACPP_URL=http://localhost:8080
# EMBEDDING_MODEL not set
```

## Provider-Specific Configuration

### vLLM Configuration

vLLM is an OpenAI-compatible server, so configure it like this:

```bash
# vLLM Configuration
OPENAI_BASE_URL=http://localhost:8000/v1
OPENAI_API_KEY=dummy
LLM_MODEL=meta-llama/Meta-Llama-3-8B-Instruct

# Embeddings (OpenAI-compatible, 1536-dim)
EMBEDDING_MODEL=text-embedding-3-small
```

### LiteLLM Configuration

LiteLLM provides a unified API for multiple providers:

```bash
# LiteLLM Configuration
OPENAI_BASE_URL=https://api.litellm.com/v1
OPENAI_API_KEY=your-litellm-key
LLM_MODEL=claude-4-sonnet

# Embeddings (use native if available)
# For OpenAI embeddings: text-embedding-3-small (1536-dim)
EMBEDDING_MODEL=text-embedding-3-small
```

### Ollama Configuration

Ollama runs local LLMs with simple configuration:

```bash
# Ollama Configuration
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_API_KEY=dummy
LLM_MODEL=llama3:8b

# Embeddings (Ollama supports native embeddings)
# Configure a local embedding model or use OpenAI embeddings
EMBEDDING_MODEL=text-embedding-3-small
```

### Text Generation WebUI Configuration

For the popular Text Generation WebUI:

```bash
# Text Generation WebUI Configuration
OPENAI_BASE_URL=http://localhost:5000/v1
OPENAI_API_KEY=dummy
LLM_MODEL=your-model-name

# Embeddings (configure native embedding model)
# For OpenAI: text-embedding-3-small, text-embedding-3-large
EMBEDDING_MODEL=text-embedding-3-small
```

## Performance Considerations

### Speed Comparison

| Approach | Speed | Quality | Resource Usage |
|----------|-------|---------|----------------|
| OpenAI Embeddings (text-embedding-3-small) | Fast | High | Low (offloaded) |
| Local Embeddings (llama.cpp) | Fast | High | High (GPU memory) |
| Fallback Hash-based | Medium | Medium | Low (CPU only) |

### Recommendations

1. **For development/testing**: Use OpenAI embeddings (fast, reliable) or enable fallback for offline mode
2. **For production with high volume**: Use OpenAI embeddings or run a dedicated local embedding model
3. **For privacy-critical applications**: Run local embedding model (llama.cpp) on-premises
4. **For offline capability**: Fallback to deterministic hash-based embeddings when API is unavailable

### Optimization Tips

1. **Use OpenAI's text-embedding-3-small** for best performance
2. **Batch requests** when possible to improve throughput
3. **Cache embeddings** for repeated text queries
4. **Use local embeddings** when working with sensitive data

## Security Considerations

### API Key Handling

For self-hosted endpoints:

```bash
# If your endpoint requires authentication
OPENAI_API_KEY=your-api-key-here

# If no authentication (like Ollama)
OPENAI_API_KEY=dummy
```

**Important**: If your self-hosted endpoint is exposed to the internet:
- Use HTTPS with valid certificates
- Implement authentication (API keys, OAuth)
- Restrict access via firewall rules
- Consider using a reverse proxy (like NGINX) for SSL termination

### Data Privacy

Self-hosted solutions provide better data privacy:

- ✅ No data leaves your infrastructure
- ✅ No third-party API calls
- ✅ Compliance with strict data residency requirements
- ⚠️ Still need to secure your local infrastructure

## Troubleshooting

### Error: "Connection refused"

**Solution**: Verify your endpoint is running:
```bash
curl http://localhost:8000/v1/models
```

### Error: "Model not found"

**Solution**: Check available models:
```bash
curl http://localhost:8000/v1/models
```

### Error: "Embedding generation failed"

**Solution**: Verify your embedding model is configured correctly. Use `text-embedding-3-small` for OpenAI or a compatible local embedding model.

### Error: "Slow embedding generation"

**Solution**: 
- Increase the LLM endpoint timeout
- Consider caching embeddings
- Use a faster embedding model if available

### Error: "Embedding model not found"

**Solution**: Verify your embedding model is available at your endpoint or use a supported OpenAI model like `text-embedding-3-small`.

## Testing Your Configuration

After configuring, test your setup:

```bash
# Test the Skill Router with self-hosted LLM
docker run --rm \
  -e OPENAI_BASE_URL="http://host.docker.internal:8000/v1" \
  -e OPENAI_API_KEY="dummy" \
  -e LLM_MODEL="llama3:8b" \
  -e EMBEDDING_MODEL="text-embedding-3-small" \
  -p 3000:3000 \
  skill-router:latest
```

Then test the endpoints:

```bash
# Test LLM endpoint
curl http://localhost:3000/v1/chat/completions \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dummy" \
  -d '{
    "model": "llama3:8b",
    "messages": [{"role": "user", "content": "test"}]
  }'

# Test embeddings endpoint
curl http://localhost:3000/embeddings \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"input": "test query", "model": "text-embedding-3-small"}'
```

## Embedding Options Comparison

| Aspect | OpenAI Embeddings | Local Embeddings |
|--------|------------------|------------------|
| **Quality** | Optimized for semantic similarity | Optimized for semantic similarity |
| **Speed** | Fast (offloaded to API) | Fast (local GPU/CPU) |
| **Cost** | Low per request (pay-per-use) | None after setup |
| **Setup** | Simple (API key only) | Requires local model |
| **Dimensions** | 1536 (fixed) | 1536 (configurable) |
| **Privacy** | External processing | Fully on-premises |
| **Best For** | Easy setup, reliability | Privacy, cost savings |

## Related Documentation

- [Full Installation Guide](../README.md#installation)
- [OpenAI Provider Configuration](config-openai.md)
- [Anthropic Provider Configuration](config-anthropic.md)
- [API Reference](../agent-skill-routing-system/skill-router-api.md)

## Support

For vLLM:
- [vLLM Documentation](https://docs.vllm.ai/)
- [vLLM GitHub](https://github.com/vllm-project/vllm)

For LiteLLM:
- [LiteLLM Documentation](https://docs.litellm.ai/)
- [LiteLLM GitHub](https://github.com/BerriAI/litellm)

For Ollama:
- [Ollama Documentation](https://ollama.com/docs)
- [Ollama GitHub](https://github.com/ollama/ollama)
