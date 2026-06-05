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
# Optional: Auto-Skill Generation (Basic)
# ─────────────────────────────────────────────────────────────────────────────

AUTO_SKILL_ENABLED=true           # Enable/disable auto-skill generation tool
AUTO_SKILL_CONTRIBUTE=true        # Enable/disable contribution to git (creates PRs)
AUTO_SKILL_MODEL=your-model-name  # LLM model used for skill generation
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

### Embedding Emulation Mode (`emulation`)

When running self-hosted LLMs without a dedicated embedding endpoint, the Skill Router supports **embedding emulation** — using any OpenAI-compatible LLM to generate embedding vectors via a prompt template:

```bash
# Use your vLLM or LiteLLM endpoint for embeddings instead of a separate model
EMBEDDING_PROVIDER=emulation
OPENAI_BASE_URL=http://localhost:8000/v1   # Your self-hosted LLM endpoint
OPENAI_API_KEY=dummy
EMBEDDING_DIMENSIONS=64                     # Default (8–3072 supported)
```

This is particularly useful for fully local deployments where you run one model for both LLM and embedding generation. The emulation prompt template asks the LLM to output a JSON array of floats, which are parsed as the embedding vector.

**Trade-offs of emulation mode:**
- ✅ No separate embedding model needed
- ✅ Works with any OpenAI-compatible endpoint (vLLM, Ollama, LiteLLM)
- ❌ Slower than native embedding APIs (LLM call vs. dedicated embedding request)
- ❌ Lower dimensional quality (64-dim default vs. 1536-dim for specialized models)

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

# LLM model (example — use any compatible model)
LLM_MODEL=meta-llama/Meta-Llama-3.1-8B-Instruct

# Embeddings (OpenAI-compatible, 1536-dim)
EMBEDDING_MODEL=text-embedding-3-small
# or use emulation mode for fully local embeddings:
# EMBEDDING_PROVIDER=emulation
```

### LiteLLM Configuration

LiteLLM provides a unified API for multiple providers, routing to different backends based on model name:

```bash
# LiteLLM Configuration
OPENAI_BASE_URL=https://api.litellm.com/v1
OPENAI_API_KEY=your-litellm-key

# Route LLM ranking to Claude
LLM_MODEL=claude-3-5-sonnet

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

## Dynamic Trigger→Domain Index

The Skill Router uses a **dynamic trigger→domain index** that replaces the previous hardcoded `KEYWORD_MAP`. This index is built automatically from every loaded skill's `metadata.triggers` field at startup, enabling:

- **Zero-code new domain discovery** — adding a new skill with triggers automatically registers it for routing
- **Live updates on reload** — `POST /reload` rebuilds the index from the current skill set
- **Intent decomposition** — the `IntentDecomposer` queries this live index to infer query domains during routing

### How It Works

1. At initialization, the router iterates every loaded skill's `metadata.triggers` and `metadata.domain`
2. Triggers are normalized (lowercased, split on commas/spaces) into a lookup map
3. During routing, user queries are tokenized and matched against this index to infer relevant domains
4. Domain inference feeds into the hybrid scoring pipeline alongside vector similarity and BM25

### LiteLLM/vLLM Relevance

For self-hosted deployments using LiteLLM or vLLM, the dynamic trigger→domain index operates entirely in-memory and does not require any LLM calls to build or query:

- **Build time**: O(n) where n = total number of loaded skills
- **Query time**: O(1) per trigger term lookup
- **Memory footprint**: Typically <1 MB for 500+ skills

This means self-hosted deployments get the same automatic domain discovery as cloud-hosted ones, with no additional API costs or latency overhead.

### Tuning with LiteLLM Routing

When using LiteLLM to route between multiple backends (e.g., vLLM for embeddings, Anthropic for ranking), the trigger→domain index remains agnostic to your backend configuration:

```bash
# LiteLLM routes both embedding and LLM calls; domain index works independently
EMBEDDING_PROVIDER=emulation     # Use emulation via LiteLLM endpoint
OPENAI_BASE_URL=https://api.litellm.com/v1
LLM_MODEL=claude-3-5-sonnet      # LiteLLM routes to Anthropic for LLM ranking
```

The dynamic index and hybrid scoring pipeline are independent of which backend handles embedding generation or LLM ranking.

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

**Solution**: Verify your embedding model is available at your endpoint. Options:
- Use a known supported model: `text-embedding-3-small` (OpenAI), or a compatible local model
- Use emulation mode instead: `EMBEDDING_PROVIDER=emulation` (uses any LLM via prompt template)
- Check available models: `curl http://localhost:8000/v1/models`

### Semantic Routing with Self-Hosted Models

**Problem**: Inconsistent results when using local LLMs for embedding emulation.

**Solution**:
- Ensure `EMBEDDING_DIMENSIONS` matches your model's actual output size (default: 64 for emulation)
- Try `SEMANTIC_SKILL_SELECTION=false` for deterministic BM25-only routing if emulation quality is insufficient
- Use `DEBUG_ROUTING=true` to inspect which signals contribute to each skill score

## Testing Your Configuration

After configuring, test your setup:

```bash
# Test the Skill Router with self-hosted LLM
docker run --rm \
  -e OPENAI_BASE_URL="http://host.docker.internal:8000/v1" \
  -e OPENAI_API_KEY="dummy" \
  -e LLM_MODEL="llama3:8b" \
  -e EMBEDDING_PROVIDER=openai \
  -e EMBEDDING_MODEL="text-embedding-3-small" \
  -p 3000:3000 \
  skill-router:latest

# Test with fully local (no external API keys) using emulation mode
docker run --rm \
  -e OPENAI_BASE_URL="http://host.docker.internal:8000/v1" \
  -e OPENAI_API_KEY="dummy" \
  -e LLM_MODEL="llama3:8b" \
  -e EMBEDDING_PROVIDER=emulation \
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
