# Configuration Reference

> One source of truth for every environment variable in the agent-skill-router system.
>
> **Total: 82 environment variables** (81 unique + 1 alias) across 14 categories

## Quick Start

To get the router running with default settings:

```bash
docker run -d \
  -e OPENAI_API_KEY=sk-... \
  -p 3000:3000 \
  skill-router:latest
```

That's it. Everything has sensible defaults. Keep reading for fine-grained control.

---

## Quick Reference Table

All variables in alphabetical order:

| Variable | Default | Category |
|---|---|---|
| `ALLOW_EXTERNAL_LINKS` | `false` | Link Following |
| `ANTHROPIC_API_KEY` | — | LLM Provider |
| `AUTO_SKILL_CACHE_DIR` | `/cache/skills` | Docker & Git Config |
| `AUTO_SKILL_CONTRIBUTE` | `true` | Docker & Git Config |
| `AUTO_SKILL_ENABLED` | `true` | Auto-Skill Generation |
| `AUTO_SKILL_MAX_RETRIES` | `3` | Auto-Skill Generation |
| `AUTO_SKILL_MODEL` | `gpt-4o-mini` | Auto-Skill Generation |
| `COMPRESSION_ADAPTIVE_TTL` | `true` | Skill Compression |
| `COMPRESSION_BATCH_SIZE` | `10` | Skill Compression |
| `COMPRESSION_CACHE_SIZE_MB` | `1024` | Skill Compression |
| `COMPRESSION_CACHE_TTL_HOURS` | `1` | Compression Advanced |
| `COMPRESSION_CLEANUP_BATCH_SIZE` | `50` | Compression Advanced |
| `COMPRESSION_RETRY_THRESHOLD` | `2` | Compression Advanced |
| `COMPRESSION_WARMUP_ENABLED` | `true` | Compression Advanced |
| `COMPRESSION_WARMUP_SKILLS` | `100` | Skill Compression |
| `COMPRESSION_WARMUP_TIMEOUT_MS` | `30000` | Skill Compression |
| `DEBUG_ROUTING` | `false` | Advanced Routing |
| `EMBEDDING_DIMENSIONS` | `1536` | Embeddings |
| `EMBEDDING_MAX_RETRIES` | `3` | Embeddings |
| `EMBEDDING_MODEL` | `text-embedding-3-small` | Embeddings |
| `EMBEDDING_PROMPT_TEMPLATE` | *(built-in default)* | Embeddings |
| `EMBEDDING_PROVIDER` | `openai` | Embeddings |
| `EXTERNAL_COMPRESSION_MODE` | `brief` | Link Following |
| `GIT_AUTHOR_EMAIL` | `skill-gen@localhost` | Docker & Git Config |
| `GIT_AUTHOR_NAME` | `Skill Generator` | Docker & Git Config |
| `GIT_COMMITTER_EMAIL` | `skill-gen@localhost` | Docker & Git Config |
| `GIT_COMMITTER_NAME` | `Skill Generator` | Docker & Git Config |
| `GITHUB_RAW_BASE_URL` | `https://raw.githubusercontent.com/paulpas/skills/main` | GitHub Sync |
| `GITHUB_SKILLS_ENABLED` | `true` | GitHub Sync |
| `GITHUB_SKILLS_REPO` | `https://github.com/paulpas/skills` | GitHub Sync |
| `GITHUB_SKILLS_REPO_SSH` | `git@github.com:paulpas/skills.git` | Docker & Git Config |
| `GITHUB_TOKEN` | — | GitHub Sync |
| `HNSW_EF_CONSTRUCTION` | `200` | Advanced Routing |
| `HNSW_EF_SEARCH` | `100` | Advanced Routing |
| `HNSW_M` | `16` | Advanced Routing |
| `JS_RENDER_FALLBACK` | `true` | Link Following |
| `JS_RENDER_TIMEOUT_MS` | `5000` | Link Following |
| `JS_RENDERING_ENABLED` | `false` | Link Following |
| `LINK_FOLLOWING_ENABLED` | `false` | Link Following |
| `LINK_RESOLUTION_MODE` | `inline` | Link Following |
| `LLAMACPP_BASE_URL` | `http://localhost:8080` | LLM Provider |
| `LLM_MODEL` | *provider-specific* | LLM Provider |
| `LLM_PROVIDER` | `openai` | LLM Provider |
| `LLM_RANKING_ENABLED` | `false` | Advanced Routing |
| `LOG_LEVEL` | `info` | Logging |
| `MAX_EXTERNAL_SIZE_KB` | `10` | Link Following |
| `MAX_LINK_DEPTH` | `2` | Link Following |
| `MAX_SKILLS` | `5` | LLM Provider |
| `MMR_LAMBDA` | `0.7` | Advanced Routing |
| `NODE_ENV` | `production` | Core Server |
| `OPENAI_API_BASE` | — *(alias for `OPENAI_BASE_URL`)* | LLM Provider |
| `OPENAI_API_KEY` | — | LLM Provider |
| `OPENAI_BASE_URL` | `https://api.openai.com` | LLM Provider |
| `PORT` | `3000` | Core Server |
| `PUPPETEER_EXECUTABLE_PATH` | `/usr/bin/chromium-browser` | Puppeteer / Chrome |
| `PUPPETEER_SKIP_DOWNLOAD` | `false` | Puppeteer / Chrome |
| `RETRIEVAL_ARCHETYPE_WEIGHT` | `0.10` | Advanced Routing |
| `RETRIEVAL_BM25_WEIGHT` | `0.20` | Advanced Routing |
| `RETRIEVAL_HISTORICAL_WEIGHT` | `0.05` | Advanced Routing |
| `RETRIEVAL_TRIGGER_MATCH_WEIGHT` | `0.15` | Advanced Routing |
| `RETRIEVAL_VECTOR_WEIGHT` | `0.50` | Advanced Routing |
| `SAFETY_STRICT` | `false` | Safety |
| `SEMANTIC_SKILL_SELECTION` | `true` | Advanced Routing |
| `SEMANTIC_SIMILARITY_THRESHOLD` | `0.3` | Link Following |
| `SEMANTIC_TOP_K` | `3` | Link Following |
| `SKILL_CACHE_DIR` | `/cache/skills` | GitHub Sync |
| `SKILL_COMPRESSION_DISK_TTL_DAYS` | `7` | Compression Advanced |
| `SKILL_COMPRESSION_ENABLED` | `true` | Compression Advanced |
| `SKILL_COMPRESSION_LAZY_WRITE_INTERVAL_MS` | `5000` | Compression Advanced |
| `SKILL_COMPRESSION_LEVEL` | `0` | Skill Compression |
| `SKILL_COMPRESSION_LLM_MODEL` | `claude-3-haiku` | Compression Advanced |
| `SKILL_COMPRESSION_MEMORY_TTL_MINUTES` | `60` | Compression Advanced |
| `SKILL_COMPRESSION_STRATEGY` | `moderate` | Compression Advanced |
| `SKILL_ROUTER_API_DOC_URL` | *(remote URL)* | MCP Bridge |
| `SKILL_ROUTER_LOG_FILE` | `~/.config/opencode/skill-router-mcp.log` | MCP Bridge |
| `SKILL_ROUTER_SKILLS_DIR` | *(auto-detected)* | MCP Bridge |
| `SKILL_ROUTER_SYNC_API_DOC` | `1` (enabled) | MCP Bridge |
| `SKILL_ROUTER_URL` | `http://localhost:3000` | MCP Bridge |
| `SKILL_SYNC_INTERVAL` | `3600` | GitHub Sync |
| `SKILLS_DIRECTORY` | `./samples/skill-definitions` | Core Server |
| `SKILL_VALIDATE_PYTHON_SCRIPT` | `scripts/validate_skill_yaml.py` | Skill Validation |
| `SSH_AUTH_SOCK` | `/tmp/ssh-agent.sock` | Docker & Git Config |

---

## Detailed Configuration

### 1. Core Server (3 vars)

Controls the HTTP server, skill file location, and runtime mode.

| Variable | Type | Default | Valid Values | Description |
|---|---|---|---|---|
| `PORT` | number | `3000` | 1–65535 | HTTP server port for the skill-router REST API |
| `SKILLS_DIRECTORY` | string | `./samples/skill-definitions` | Valid directory path | Local directory containing skill markdown files. Overridden to `/app/skills` in Docker. |
| `NODE_ENV` | string | `production` | `development`, `production`, `test` | Node.js runtime environment mode |

**Source:** `src/index.ts` lines 993–994, Dockerfile line 173.

---

### 2. Logging (1 var)

Controls the verbosity of structured log output.

| Variable | Type | Default | Valid Values | Description |
|---|---|---|---|---|
| `LOG_LEVEL` | string | `info` | `debug`, `info`, `warn`, `error` | Controls verbosity of log output. `debug` is most verbose, `error` is quietest. |

**Source:** `src/observability/Logger.ts` line 35, Dockerfile line 88.

---

### 3. Safety (1 var)

Enables strict input validation to protect against prompt injection and malformed requests.

| Variable | Type | Default | Valid Values | Description |
|---|---|---|---|---|
| `SAFETY_STRICT` | boolean | `false` | `true`, `false` | Enables strict input validation. When `true`, blocks on any single signal of prompt injection. When `false`, uses multi-signal consensus (default). |

**Technical details:** `SAFETY_STRICT` interacts with the safety layer's `enablePromptInjectionFilter` config option. When strict mode is off, injection detection requires multiple signals to trigger a block. When on, a single suspicious signal is sufficient.

**Source:** `src/core/SafetyLayer.ts` line 9, `config/default.json` line 86.

---

### 4. LLM Provider (7 vars + 1 alias)

Configures the large language model backend used for ranking skills against user tasks.

| Variable | Type | Default | Valid Values | Description |
|---|---|---|---|---|
| `LLM_PROVIDER` | string | `openai` | `openai`, `anthropic`, `llamacpp` | LLM backend for ranking skill candidates against user tasks |
| `LLM_MODEL` | string | *provider-specific* | Any valid model name | Model identifier. Defaults: `gpt-4o-mini` (openai), `claude-3-5-haiku-20241022` (anthropic), `local-model` (llamacpp) |
| `OPENAI_API_KEY` | string | — | Valid OpenAI API key | API key for both LLM ranking and embedding generation via OpenAI |
| `OPENAI_BASE_URL` | string | `https://api.openai.com` | Valid URL | Custom OpenAI-compatible base URL. Supports LiteLLM, vLLM, ollama, etc. Strips trailing `/v1` automatically. |
| `OPENAI_API_BASE` | string | — *(alias)* | Valid URL | Alternate name for `OPENAI_BASE_URL`. If both are set, `OPENAI_BASE_URL` takes precedence. |
| `ANTHROPIC_API_KEY` | string | — | Valid Anthropic API key | Required when `LLM_PROVIDER=anthropic` |
| `LLAMACPP_BASE_URL` | string | `http://localhost:8080` | Valid URL | llama.cpp server URL. Required when `LLM_PROVIDER=llamacpp`. Docker default points to `http://host.docker.internal:8080` |
| `MAX_SKILLS` | number | `5` | 1–20 | Maximum number of skills returned in a single route response. Applied as a cap on top of LLM ranking results. |

**Source:** `src/llm/LLMRanker.ts` lines 13, 39–45, `src/index.ts` line 730, Dockerfile lines 78–82.

---

### 5. Embeddings (5 unique vars + 2 shared)

Configures the embedding backend for semantic skill search.

| Variable | Type | Default | Valid Values | Description |
|---|---|---|---|---|
| `EMBEDDING_PROVIDER` | string | `openai` | `openai`, `llamacpp`, `emulation` | Embedding backend. `emulation` uses an LLM call to generate embeddings without a dedicated embedding model. |
| `EMBEDDING_MODEL` | string | *provider-specific* | Any valid embedding model | Model identifier. Defaults: `text-embedding-3-small` (openai), `local-embedding-model` (llamacpp), `gpt-4o-mini` (emulation) |
| `EMBEDDING_DIMENSIONS` | number | `1536` | Usually 64, 384, 768, 1024, 1536, 3072 | Embedding vector dimensions. The emulation provider generates 64-dimensional vectors. |
| `EMBEDDING_PROMPT_TEMPLATE` | string | *(hardcoded default)* | Template with `{{text}}` placeholder | Custom prompt template for LLM-based embedding emulation. The default asks the LLM to output a JSON array of 64 floats. |
| `EMBEDDING_MAX_RETRIES` | number | `3` | 0–10 | Maximum retry attempts when embedding generation fails. On exhaustion, falls back to deterministic hash-based embeddings. |

**Shared from LLM Provider:**
| Variable | Notes |
|---|---|
| `OPENAI_API_KEY` | Used for `openai` and `emulation` providers |
| `OPENAI_BASE_URL` | Used to route to custom OpenAI-compatible endpoints |

**Source:** `src/embedding/EmbeddingService.ts` lines 16, 72–77, 82–89.

**Example — emulation mode with custom template:**
```bash
-e EMBEDDING_PROVIDER=emulation \
-e OPENAI_API_KEY=sk-... \
-e EMBEDDING_DIMENSIONS=128 \
-e EMBEDDING_PROMPT_TEMPLATE="Summarize this text as {{text}} dimensions"
```

---

### 6. GitHub Sync / Remote Index (6 vars)

Controls how the router discovers and syncs skills from the remote GitHub repository.

| Variable | Type | Default | Valid Values | Description |
|---|---|---|---|---|
| `GITHUB_SKILLS_ENABLED` | boolean | `true` | `true`, `false` | Enable fetching the remote skills index on startup. When `false`, uses only local skill directories. |
| `GITHUB_RAW_BASE_URL` | string | `https://raw.githubusercontent.com/paulpas/skills/main` | Valid URL | Base URL for fetching `skills-index.json` and individual skill files via raw HTTP |
| `SKILL_SYNC_INTERVAL` | number | `3600` | 60–86400 (0 to disable) | Seconds between periodic index syncs. At each interval, the router re-fetches `skills-index.json` and discovers new skills. |
| `GITHUB_TOKEN` | string | — | Valid GitHub personal access token | Token for accessing private repositories or increasing API rate limits during raw file fetches |
| `GITHUB_SKILLS_REPO` | string | `https://github.com/paulpas/skills` | Valid Git URL | Git repository URL for fallback clone when the raw index fetch fails. Used by `GitHubSkillLoader`. |
| `SKILL_CACHE_DIR` | string | `/cache/skills` | Valid absolute path | Local directory where the git clone of the skills repository is cached for fallback access |

**Startup flow:**
```
GITHUB_SKILLS_ENABLED=true
    └── loadFromRemoteIndex(skills-index.json)
        ├── ✅ Success → periodic sync every SKILL_SYNC_INTERVAL
        └── ❌ Failure → git clone GITHUB_SKILLS_REPO into SKILL_CACHE_DIR
                           └── startSync() for ongoing git pulls
```

**Source:** `src/index.ts` lines 714, 760–818, `src/core/SkillRegistry.ts` lines 417–420, Dockerfile lines 83–87.

---

### 7. Skill Compression (6 vars)

Controls the core skill compression system — the primary mechanism for fitting 1,800+ skills into LLM context windows.

| Variable | Type | Default | Valid Values | Description |
|---|---|---|---|---|
| `SKILL_COMPRESSION_LEVEL` | number | `0` | 0–11 | Compression aggressiveness. 0 = disabled, 1–2 = remove blank lines/comments, 3–4 = collapse docs, 5–6 = refactor code patterns, 7–8 = abbreviate exports, 9–10 = trim imports/control flow, 11 = maximum. In Docker, defaults to `4`. |
| `COMPRESSION_CACHE_SIZE_MB` | number | `1024` | 1–10240 | Maximum size of the in-memory LRU compression cache in megabytes. At 1 GB, can hold ~10,000 compressed skill entries. |
| `COMPRESSION_WARMUP_SKILLS` | number | `100` | 0–1000 | Number of top skills to pre-compress in cache during startup background warmup. Set to `0` to disable warmup entirely. Dockerfile defaults to `50`. |
| `COMPRESSION_WARMUP_TIMEOUT_MS` | number | `30000` | 1000–300000 | Maximum time allocated for the warmup phase. If exceeded, warmup is abandoned but the server continues normally. |
| `COMPRESSION_BATCH_SIZE` | number | `10` | 1–100 | Number of skills to compress per batch call. Higher values reduce API calls but increase per-batch latency and memory. |
| `COMPRESSION_ADAPTIVE_TTL` | boolean | `true` | `true`, `false` | When enabled, frequently accessed skills remain in cache longer (hot skills: 30 min TTL, cold skills: 60 min TTL). When disabled, all skills use a fixed 60 min TTL. |

**Compression Level Reference:**

| Level | Technique | Est. Savings |
|---|---|---|
| 0 | No compression (original) | 0% |
| 1 | Remove blank lines | ~5% |
| 2 | Remove "When to Use" section | ~12% |
| 3 | Remove "When NOT to Use" section | ~18% |
| 4 | Collapse "Core Workflow" to paragraph | ~28% |
| 5 | Remove related-skills table | ~35% |
| 6 | Remove markdown formatting | ~42% |
| 7 | Remove code examples | ~55% |
| 8 | Abbreviate section names | ~68% |
| 9 | Combine all sections | ~75% |
| 10+ | Summary only (first 200 chars) | ~85% |

**Source:** `src/index.ts` lines 724–727, 833–848, 961–966, Dockerfile lines 139–157.

---

### 8. Link Following (11 vars)

Controls how the router resolves internal and external links within skill content. Disabled by default — opt in.

| Variable | Type | Default | Valid Values | Description |
|---|---|---|---|---|
| `LINK_FOLLOWING_ENABLED` | boolean | `false` | `true`, `false` | Master switch for automatic link resolution when processing skills |
| `ALLOW_EXTERNAL_LINKS` | boolean | `false` | `true`, `false` | When `true`, external HTTP(S) URLs are fetched and their content included. Must be `true` for Puppeteer/JS rendering to activate. |
| `MAX_LINK_DEPTH` | number | `2` | 0–5 | Maximum recursion depth when following nested links within resolved content |
| `MAX_EXTERNAL_SIZE_KB` | number | `10` | 1–10000 | Content size threshold in KB. Content exceeding this size is handled per `EXTERNAL_COMPRESSION_MODE`. |
| `EXTERNAL_COMPRESSION_MODE` | string | `brief` | `brief`, `moderate`, `skip` | How to handle external content exceeding `MAX_EXTERNAL_SIZE_KB`. `brief` = first 10% of content, `moderate` = first 50%, `skip` = discard entirely. |
| `JS_RENDERING_ENABLED` | boolean | `false` | `true`, `false` | Enable Chromium-based JavaScript rendering for dynamic pages (SPAs, JS-rendered docs). Requires Puppeteer/Chrome. |
| `JS_RENDER_TIMEOUT_MS` | number | `5000` | 1000–60000 | Maximum time to wait for JavaScript rendering to complete before falling back |
| `JS_RENDER_FALLBACK` | boolean | `true` | `true`, `false` | When `true`, falls back to static HTTP fetch if JS rendering fails or times out |
| `LINK_RESOLUTION_MODE` | string | `inline` | `inline`, `semantic`, `compressed` | How resolved content is incorporated into the skill. `inline` = full raw content, `semantic` = relevant chunks only, `compressed` = compressed/extracted version. |
| `SEMANTIC_TOP_K` | number | `3` | 1–20 | Number of most semantically relevant chunks to return when `LINK_RESOLUTION_MODE=semantic`. Chunks are selected by cosine similarity. |
| `SEMANTIC_SIMILARITY_THRESHOLD` | number | `0.3` | 0.0–1.0 | Minimum cosine similarity score for a chunk to be included in semantic mode results. Lower values include more content. |

**Resolution mode behavior:**

```
inline     → Fetch & embed full content verbatim
semantic   → Fetch → chunk → embed → rank → return top SEMANTIC_TOP_K chunks
compressed → Fetch → compress (LLM or regex) → embed compressed version
```

**Source:** Dockerfile lines 160–171.

---

### 9. Auto-Skill Generation (3 vars)

Controls the TypeScript-based MCP tool that generates new `SKILL.md` files on demand using an LLM.

| Variable | Type | Default | Valid Values | Description |
|---|---|---|---|---|
| `AUTO_SKILL_ENABLED` | boolean | `true` | `true`, `false` | Master switch for the auto-skill generation tool. When `false`, the `generate_skill` MCP tool is not registered. |
| `AUTO_SKILL_MODEL` | string | `gpt-4o-mini` | Any valid model name | LLM model used for generating new skill files. Must be available via the configured OpenAI-compatible endpoint. |
| `AUTO_SKILL_MAX_RETRIES` | number | `3` | 1–10 | Maximum LLM retry attempts when skill generation fails (API error, validation failure, malformed output). |

**Source:** `src/mcp/tools/SkillGenerationTool.ts` lines 75–79, `src/mcp/MCPBridge.ts` line 91, Dockerfile lines 95–98.

---

### 10. Puppeteer / Chrome (2 vars)

Controls the Puppeteer headless browser used for JS rendering in link following.

| Variable | Type | Default | Valid Values | Description |
|---|---|---|---|---|
| `PUPPETEER_SKIP_DOWNLOAD` | boolean | `false` | `true`, `false` | Skip downloading Chromium during `npm install`. Always set to `true` in Docker (system Chromium is installed via apk). |
| `PUPPETEER_EXECUTABLE_PATH` | string | — | Valid path to Chromium/Chrome | Path to the Chromium or Chrome binary. In Docker, set to `/usr/bin/chromium-browser`. Required when `PUPPETEER_SKIP_DOWNLOAD=true`. |

**Docker setup:**
```dockerfile
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
RUN apk add --no-cache chromium
```

**Source:** Dockerfile lines 70, 169.

---

### 12. MCP Bridge (5 vars)

Configures the stdio MCP bridge (`skill-router-mcp.js`) that connects OpenCode to the skill router via the Model Context Protocol.

| Variable | Type | Default | Valid Values | Description |
|---|---|---|---|---|
| `SKILL_ROUTER_URL` | string | `http://localhost:3000` | Valid URL | HTTP base URL of the running skill router. The MCP bridge proxies all `route_to_skill` and `list_skills` calls to this URL. |
| `SKILL_ROUTER_LOG_FILE` | string | `~/.config/opencode/skill-router-mcp.log` | Valid file path | Path to the MCP bridge's own log file (separate from the router's logs). Directory is auto-created. |
| `SKILL_ROUTER_API_DOC_URL` | string | `https://raw.githubusercontent.com/paulpas/skills/main/agent-skill-routing-system/skill-router-api.md` | Valid URL | Remote URL for `skill-router-api.md` that is periodically synced to keep the OpenCode auto-routing directive up to date. |
| `SKILL_ROUTER_SYNC_API_DOC` | boolean | `1` (enabled) | `0` (disable), `1` (enable) | When enabled (default), the bridge syncs `skill-router-api.md` from remote every hour. Set to `0` to disable. |
| `SKILL_ROUTER_SKILLS_DIR` | string | *(auto-detected)* | Valid directory path | Filesystem path to the `skills/` directory tree. Used as fallback when the router can't serve a skill via HTTP. Auto-detects from several well-known paths. |

**Auto-detection candidates** (in order of precedence):
1. The value of `SKILL_ROUTER_SKILLS_DIR` env var
2. `~/git/agent-skill-router/skills`
3. `~/git/skills/skills`
4. `~/git/skills`
5. `~/.config/opencode/skills`

**Source:** `skill-router-mcp.js` lines 8–14, 28–55.

---

### 13. Advanced Routing (11 vars)

Controls the hybrid scoring pipeline, MMR diversification, and score explanations for the routing system.

| Variable | Type | Default | Valid Values | Description |
|---|---|---|---|---|---|
| `DEBUG_ROUTING` | boolean | `false` | `true`, `false` | When enabled, each routed skill includes a per-component breakdown with human-readable explanations. Useful for debugging routing decisions. |
| `HNSW_EF_CONSTRUCTION` | number | `200` | 1–1000 | Candidate list size during HNSW index construction. Higher values = better recall, slower build. Set lower (e.g. 50) for faster development builds. |
| `HNSW_EF_SEARCH` | number | `100` | 1–1000 | Candidate list size during HNSW search. Higher values = better recall, slower queries. |
| `HNSW_M` | number | `16` | 4–128 | Maximum number of bidirectional connections per HNSW graph element per layer. Higher values improve recall at the cost of memory. |
| `LLM_RANKING_ENABLED` | boolean | `false` | `true`, `false` | When enabled, uses LLM-based ranking as an optional fallback after hybrid scoring. Default is `false` (hybrid scoring only). |
| `MMR_LAMBDA` | float | `0.7` | `0.0` – `1.0` | MMR diversity tradeoff. `0.0` = maximum diversity, `1.0` = pure relevance. The default `0.7` favors relevance while still penalizing near-duplicate skills. |
| `RETRIEVAL_ARCHETYPE_WEIGHT` | float | `0.10` | `0.0` – `1.0` | Weight for archetype alignment signal. Higher values prioritize skills matching the query's archetype (tactical, strategic, diagnostic, etc.). |
| `RETRIEVAL_BM25_WEIGHT` | float | `0.20` | `0.0` – `1.0` | Weight for BM25 exact-term matching signal. Higher values prioritize skills with exact keyword matches. |
| `RETRIEVAL_HISTORICAL_WEIGHT` | float | `0.05` | `0.0` – `1.0` | Weight for historical success rate signal. Higher values prioritize skills with proven routing success. |
| `RETRIEVAL_TRIGGER_MATCH_WEIGHT` | float | `0.15` | `0.0` – `1.0` | Weight for trigger keyword matching signal. Higher values prioritize skills whose configured triggers match query terms. |
| `RETRIEVAL_VECTOR_WEIGHT` | float | `0.50` | `0.0` – `1.0` | Weight for semantic vector similarity signal. Higher values prioritize skills semantically closest to the query. This is the primary signal. |

**Source:** `src/core/Router.ts` lines 352, 474, `src/embedding/VectorDatabase.ts` lines 41–43.

> **Note:** All weights now support environment variable configuration. The priority order is: programmatic `RouterConfig` > environment variable > code default. See [AGENTS.md#advanced-routing-system-v2](../AGENTS.md#advanced-routing-system-v2) for the full configuration reference.

---

### 14. Docker & Git Config (10 vars)

Container-level configuration for git operations (required for skill contribution and SSH-based repository access).

#### Skill Contribution Settings

| Variable | Type | Default | Valid Values | Description |
|---|---|---|---|---|
| `AUTO_SKILL_CONTRIBUTE` | boolean | `true` | `true`, `false` | When enabled, generated skills are automatically committed and pushed to the skills repository. |
| `AUTO_SKILL_CACHE_DIR` | string | `/cache/skills` | Valid absolute path | Separate cache directory for auto-generated skill files (distinct from `SKILL_CACHE_DIR` used for the cloned skills repo). |
| `GIT_AUTHOR_NAME` | string | `Skill Generator` | Any git user name | Git author name for auto-generated commits from skill generation |
| `GIT_AUTHOR_EMAIL` | string | `skill-gen@localhost` | Any git email | Git author email for auto-generated commits |
| `GIT_COMMITTER_NAME` | string | `Skill Generator` | Any git user name | Git committer name (separate from author for attribution) |
| `GIT_COMMITTER_EMAIL` | string | `skill-gen@localhost` | Any git email | Git committer email |

#### SSH & Authentication

| Variable | Type | Default | Valid Values | Description |
|---|---|---|---|---|
| `GITHUB_SKILLS_REPO_SSH` | string | `git@github.com:paulpas/skills.git` | Valid SSH Git URL | SSH-based git URL for the skills repository. Used when SSH agent forwarding is available. |
| `SSH_AUTH_SOCK` | string | `/tmp/ssh-agent.sock` | Valid Unix socket path | Path to the SSH agent socket for git operations. Mount the host agent socket: `-v $SSH_AUTH_SOCK:/tmp/ssh-agent.sock:ro` |

**SSH authentication patterns:**
- **Static keys:** `-v ~/.ssh:/home/appuser/.ssh:ro`
- **Agent forwarding:** `-v $SSH_AUTH_SOCK:/tmp/ssh-agent.sock -e SSH_AUTH_SOCK=/tmp/ssh-agent.sock`

**Source:** Dockerfile lines 92, 96, 99, 110–115.

---

### 15. Compression Advanced (9 vars)

Docker-level tuning variables for the LLM-based skill compression subsystem. These control the caching, batching, and storage behavior at scale (1,800+ skills).

| Variable | Type | Default | Valid Values | Description |
|---|---|---|---|---|
| `SKILL_COMPRESSION_ENABLED` | boolean | `true` | `true`, `false` | Master switch for the LLM-based compression system. When false, falls back to regex-based lightweight compression. |
| `SKILL_COMPRESSION_STRATEGY` | string | `moderate` | `moderate`, `aggressive`, `conservative` | Compression strategy profile that adjusts how aggressively skills are compressed by the LLM. |
| `SKILL_COMPRESSION_LLM_MODEL` | string | `claude-3-haiku` | Any valid model name | LLM model used specifically for skill compression calls (separate from the ranking model). |
| `SKILL_COMPRESSION_MEMORY_TTL_MINUTES` | number | `60` | 1–1440 | Time-to-live for compressed skills in the in-memory cache. After this period, the entry is eligible for eviction. |
| `SKILL_COMPRESSION_DISK_TTL_DAYS` | number | `7` | 1–365 | Time-to-live for compressed skills on disk. Older entries are cleaned up by the periodic cleanup job. |
| `SKILL_COMPRESSION_LAZY_WRITE_INTERVAL_MS` | number | `5000` | 1000–60000 | Debounce interval for writing compressed skills to disk. Changes are batched to reduce I/O. |
| `COMPRESSION_CACHE_TTL_HOURS` | number | `1` | 1–168 | Legacy TTL for the LRU compression cache in hours. Superseded by `COMPRESSION_ADAPTIVE_TTL` when enabled. |
| `COMPRESSION_RETRY_THRESHOLD` | number | `2` | 1–10 | Number of consecutive compression failures before a skill is marked as "uncompressible" and excluded from future attempts. |
| `COMPRESSION_CLEANUP_BATCH_SIZE` | number | `50` | 10–500 | Number of expired entries to remove per cleanup cycle. Higher values clear disk faster but increase I/O pressure. |
| `COMPRESSION_WARMUP_ENABLED` | boolean | `true` | `true`, `false` | When `false`, skips the startup warmup phase entirely (skills are compressed on first access instead). |

**Source:** Dockerfile lines 131–157.

---

### 16. Skill Validation (2 vars)

Controls the pre-commit validation pipeline that gates SKILL.md commits and the new semantic selection gate for routing.

| Variable | Type | Default | Valid Values | Description |
|---|---|---|---|---|
| `SEMANTIC_SKILL_SELECTION` | boolean | `true` | `true`, `false` | When `false`, disables semantic-based skill selection (vector similarity + BM25 scoring). Trigger keyword matching and archetype ranking remain active. Useful when embeddings are unavailable or for deterministic-only routing. Implemented in `Router.ts` — zeros vectorWeight and bm25Weight when set to `false`. |
| `SKIP_SKILL_VALIDATE` | string | `""` | Any non-empty string | Emergency bypass for the pre-commit hook validation. Set to `1` to skip all skill validation on a specific commit. |

**Validator architecture:** The pre-commit hook runs `scripts/validate_skill.sh` which has three phases:

- **Phase 1 — Structural checks** via `scripts/validate_skill_yaml.py` (8 checks):
  1. YAML frontmatter must parse correctly with `yaml.safe_load()`
  2. `name:` field in frontmatter MUST exactly match the directory name (kebab-case)
  3. `version:` field must be quoted — use `"1.0.0"` not `1.0.0`
  4. Frontmatter delimiters must be exactly `---` (not more dashes)
  5. `name:` must appear on line 2, immediately after the opening `---`
  6. Metadata block MUST include all required fields: `triggers`, `domain`, `role`, `scope`, `output-format`
  7. Triggers must have 3–8 comma-separated terms (no more, no less)
  8. If role is `'implementation'` or `'review'`, the skill MUST have a `## Constraints` section with `### MUST DO` and `### MUST NOT DO` subsections

- **Phase 2 — Stub detection** (bash checks):
  - File must be ≥ 3,000 bytes of content (not counting frontmatter)
  - No stub sentinel text: `'Implementing this specific pattern or feature'`
  - At least 2 fenced code blocks with REAL code (for implementation skills)
  - No generic workflow steps like `"Identify the use case"`, `"Apply the pattern"`, `"Validate and test"`
  - Routing metadata fields (`archetypes`, `anti_triggers`, `response_profile`) must be present

- **Phase 3 — LLM quality check** (optional): When `--llm` flag is passed, runs an LLM-based quality assessment.

**Source:** `scripts/validate_skill.sh`, `scripts/validate_skill_yaml.py`

---

## Architecture: How Configuration Flows

```
    ┌──────────────────────────────────────────────────┐
    │              Environment Variables                │
    │  (Docker -e flags, .env file, shell export)       │
    └──────────────────────┬───────────────────────────┘
                           │
                           ▼
    ┌──────────────────────────────────────────────────┐
    │              src/index.ts                         │
    │  Reads process.env.* with dotenv fallback          │
    │  Applies defaults inline (|| operator)             │
    └──────────────────────┬───────────────────────────┘
                           │
                           ▼
    ┌──────────────────────────────────────────────────┐
    │              ConfigInterface                      │
    │  (TypeScript types, validated at constructor)      │
    └──┬──────────┬──────────┬──────────┬──────────────┘
       │          │          │          │
       ▼          ▼          ▼          ▼
    ┌──────┐ ┌────────┐ ┌──────────┐ ┌──────────────┐
    │ LLM  │ │Embedding│ │  Skill   │ │  MCP Bridge   │
    │Ranker│ │ Service │ │ Registry │ │  (Tool Mgmt)  │
    └──────┘ └────────┘ └──────────┘ └──────────────┘
       │          │          │                │
       ▼          ▼          ▼                ▼
    ┌──────┐ ┌────────┐ ┌──────────┐ ┌──────────────┐
    │OpenAI│ │OpenAI/ │ │  GitHub  │ │  generate_skill│
    │Anthr.│ │llama.cpp│ │  Index   │ │  shell, file  │
    │llama │ │Emulat. │ │  Cache   │ │  http, etc.   │
    └──────┘ └────────┘ └──────────┘ └──────────────┘
       │          │          │
       ▼          ▼          ▼
    ┌──────────────────────────────────────────────────┐
    │         Runtime Behavior                         │
    │  - Skill routing & ranking                       │
    │  - Embedding generation & similarity search      │
    │  - Compression & cache management                │
    │  - Periodic GitHub sync                          │
    └──────────────────────────────────────────────────┘
```

**Additional config consumers (not shown above for clarity):**

```
    ┌──────────────────┐    ┌────────────────────────┐
    │ SafetyLayer.ts   │    │  skill-router-mcp.js   │
    │   SAFETY_STRICT  │    │  SKILL_ROUTER_URL      │
    └──────────────────┘    │  SKILL_ROUTER_LOG_FILE  │
                            │  SKILL_ROUTER_SKILLS_DIR│
    ┌──────────────────┐    │  SKILL_ROUTER_API_DOC   │
    │ Logger.ts        │    │  SKILL_ROUTER_SYNC_DOC  │
    │   LOG_LEVEL      │    └────────────────────────┘
    └──────────────────┘
```

---

## Configuration Priorities

The system loads config with this precedence (higher overrides lower):

| Priority | Source | Example |
|---|---|---|
| **1 (highest)** | Docker `-e` flags | `docker run -e PORT=4000 ...` |
| **2** | `.env` file | `PORT=4000` in working directory |
| **3** | CLI arguments | `node dist/index.js --port=4000` |
| **4 (lowest)** | Hardcoded defaults | `process.env.PORT \|\| '3000'` |

**Rule of thumb:** Docker `-e` always wins. If you set a variable in `.env` but the Dockerfile also sets it, the Dockerfile's value applies at build time and `-e` overrides at runtime.

---

## Auto-Discovery

The router detects new skills from the GitHub repository automatically:

- **On startup** — the skills index is fetched from `GITHUB_RAW_BASE_URL/skills-index.json`
- **Periodically** — re-fetched every `SKILL_SYNC_INTERVAL` seconds (default: 3,600 = 1 hour)
- **On demand** — trigger immediate re-indexing:
  ```bash
  curl -X POST http://localhost:3000/reload
  ```

New skills pushed to `GITHUB_SKILLS_REPO` are discovered within `SKILL_SYNC_INTERVAL` seconds, or immediately after a `POST /reload` call.

### Startup Flow

```
Container starts
    │
    ├── GITHUB_SKILLS_ENABLED=true?
    │       ├── Yes → fetch remote index (raw HTTP)
    │       │       ├── Success → register skills, start periodic sync
    │       │       └── Fail → git clone GITHUB_SKILLS_REPO
    │       │                   └── start background git sync
    │       └── No → scan local SKILLS_DIRECTORY only
    │
    ├── COMPRESSION_WARMUP_SKILLS > 0?
    │       └── Yes → pre-compress top skills in background
    │
    └── Server ready on PORT
```

---

## Per-Provider Configuration Examples

### OpenAI (Recommended)

```bash
docker run -d \
  --name skill-router \
  -e OPENAI_API_KEY=sk-... \
  -e LLM_PROVIDER=openai \
  -e LLM_MODEL=gpt-4o-mini \
  -e EMBEDDING_PROVIDER=openai \
  -e EMBEDDING_MODEL=text-embedding-3-small \
  -p 3000:3000 \
  skill-router:latest
```

### Anthropic (LLM) + OpenAI (Embeddings)

```bash
docker run -d \
  --name skill-router \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  -e LLM_PROVIDER=anthropic \
  -e LLM_MODEL=claude-3-5-haiku-20241022 \
  -e OPENAI_API_KEY=sk-... \
  -e EMBEDDING_PROVIDER=openai \
  -e EMBEDDING_MODEL=text-embedding-3-small \
  -p 3000:3000 \
  skill-router:latest
```

### llama.cpp (Fully Local, No API Keys)

```bash
docker run -d \
  --name skill-router \
  -e LLM_PROVIDER=llamacpp \
  -e LLM_MODEL=local-model \
  -e LLAMACPP_BASE_URL=http://host.docker.internal:8080 \
  -e EMBEDDING_PROVIDER=llamacpp \
  -e EMBEDDING_MODEL=local-embedding-model \
  -p 3000:3000 \
  skill-router:latest
```

### Emulation Mode (OpenAI LLM + Synthetic Embeddings)

```bash
docker run -d \
  --name skill-router \
  -e EMBEDDING_PROVIDER=emulation \
  -e EMBEDDING_MODEL=gpt-4o-mini \
  -e OPENAI_API_KEY=sk-... \
  -p 3000:3000 \
  skill-router:latest
```

### LiteLLM / vLLM (Custom OpenAI-Compatible)

```bash
docker run -d \
  --name skill-router \
  -e OPENAI_API_KEY=sk-localkey \
  -e OPENAI_BASE_URL=http://host.docker.internal:4000 \
  -e LLM_PROVIDER=openai \
  -e LLM_MODEL=gpt-4o-mini \
  -e EMBEDDING_PROVIDER=openai \
  -e EMBEDDING_MODEL=text-embedding-3-small \
  -p 3000:3000 \
  skill-router:latest
```

---

## Recommended Production Settings

For a production deployment with 1,800+ skills:

```bash
docker run -d \
  --name skill-router \
  --restart unless-stopped \
  -e OPENAI_API_KEY=sk-... \
  -e LLM_PROVIDER=openai \
  -e EMBEDDING_PROVIDER=openai \
  -e SKILL_COMPRESSION_LEVEL=4 \         # 28% token savings
  -e COMPRESSION_CACHE_SIZE_MB=2048 \    # 2 GB for larger cache
  -e COMPRESSION_WARMUP_SKILLS=200 \     # Warm up more skills
  -e COMPRESSION_ADAPTIVE_TTL=true \     # Smart cache eviction
  -e LOG_LEVEL=warn \                    # Reduce log volume
  -e SKILL_SYNC_INTERVAL=3600 \          # Check hourly for new skills
  -v /host/path/skills-cache:/cache/skills \  # Persist cache
  -p 3000:3000 \
  skill-router:latest
```

---

## Related Documentation

| Document | Purpose |
|---|---|
| `docs/README.md` | Documentation index |
| `docs/config-openai.md` | OpenAI-specific setup guide |
| `docs/config-anthropic.md` | Anthropic-specific setup guide |
| `docs/config-litellm-vllm.md` | LiteLLM/vLLM compatibility guide |
| `docs/show-and-tell-presentation.md` | Full system architecture walkthrough |
| `COMPRESSION.md` | Compression subsystem deep-dive |
| `LLM_COMPRESSION.md` | LLM compression architecture |
| `DEPLOYMENT.md` | Rollout strategies and phase planning |
