# Skill Router — Show and Tell

**What happens when an AI needs the right expertise, and it needs it now.**

The Agent Skill Router is a smart routing engine that matches user tasks to specialized "skill" documents loaded by OpenCode AI agents. Think of it as a GPS for AI expertise: you tell the router what you want to do, and it finds the right set of instructions to make the AI an expert in that domain.

```ascii
┌─────────────────────────────────────────────────────────────────┐
│                      HIGH-LEVEL SYSTEM                           │
│                                                                   │
│  You ask...              Router finds...          AI becomes...   │
│                                                                   │
│  "review this code"  ──▶  coding-code-review   ──▶  expert        │
│                          coding-security-review     reviewer      │
│                                                                   │
│  "deploy to K8s"    ──▶  cncf-kubernetes       ──▶  platform     │
│                          cncf-helm                  engineer      │
│                                                                   │
│  "implement a       ──▶  trading-vwap           ──▶  algo trader  │
│   TWAP strategy"         trading-risk-stops                        │
│                                                                   │
│  All without typing a single `/skill` command.                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Table of Contents

- [What Is This Thing?](#what-is-this-thing)
- [How It Works: The Routing Pipeline](#how-it-works-the-routing-pipeline)
- [Skill Loading: Where Skills Come From](#skill-loading-where-skills-come-from)
- [Skills: What They Are and How They're Organized](#skills-what-they-are-and-how-theyre-organized)
- [MCP Integration: How OpenCode Talks to the Router](#mcp-integration-how-opencode-talks-to-the-router)
- [Vector Search: The Semantics Engine](#vector-search-the-semantics-engine)
- [LLM Ranking: The Final Arbiter](#llm-ranking-the-final-arbiter)
- [Skill Compression: Saving Tokens Without Losing Meaning](#skill-compression-saving-tokens-without-losing-meaning)
- [API Endpoints: Talking to the Router Directly](#api-endpoints-talking-to-the-router-directly)
- [Docker Deployment: Running the Router](#docker-deployment-running-the-router)
- [Performance Numbers](#performance-numbers)
- [Creating a New Skill](#creating-a-new-skill)
- [Configuration Reference](#configuration-reference)
- [Why This Is Cool](#why-this-is-cool)

---

## What Is This Thing?

The Skill Router is a TypeScript application that runs in a Docker container and acts as a **middleman between AI agents and specialized knowledge**. It manages a library of 750+ "skill" documents — markdown files that each contain expert instructions for a specific domain.

When an AI agent receives a task (like "review this code for security issues"), the router:

1. **Understands** what the task is really about (via semantic embeddings)
2. **Finds** the most relevant skills from its library (via vector search)
3. **Ranks** them to pick only the best matches (via an LLM judge)
4. **Delivers** the skill content back into the AI's context

The result: the AI agent suddenly _knows_ how to be a security code reviewer, a Kubernetes deployment expert, or an algorithmic trading developer — all without you needing to load anything manually.

```ascii
  ┌──────────────┐     "review this Python code for SQL injection"     ┌──────────────┐
  │              │ ──────────────────────────────────────────────────▶  │              │
  │    You       │                                                     │    Router    │
  │              │ ◀──────────────────────────────────────────────────  │   :3000      │
  └──────────────┘     Full expert skill content injected              └──────────────┘
                                                                              │
                                                                              ▼
                                                                     ┌──────────────────┐
                                                                     │  Skill Library    │
                                                                     │  ┌──────────────┐ │
                                                                     │  │code-review   │ │
                                                                     │  │security      │ │
                                                                     │  │kubernetes    │ │
                                                                     │  │vwap          │ │
                                                                     │  │... 750+ more  │ │
                                                                     │  └──────────────┘ │
                                                                     └──────────────────┘
```

### Where It Lives

| Layer | Technology |
|---|---|
| Runtime | Node.js 24 on Alpine Linux |
| Web framework | Fastify |
| Vector search | Custom KD-tree implementation |
| Embeddings | OpenAI `text-embedding-3-small` (1536 dimensions) |
| LLM ranking | OpenAI / Anthropic / llama.cpp |
| Deployment | Docker (node:24-alpine, ~757MB) |
| Port | 3000 |

---

## How It Works: The Routing Pipeline

The core routing logic lives in `src/core/Router.ts`. When you send a task to `/route`, it goes through a six-stage pipeline:

```ascii
                        ┌───────── ROUTING PIPELINE ──────────┐
                        │                                       │
   POST /route          │                                       │
   { "task": "..." }    │                                       │
        │               │                                       │
        ▼               │                                       │
   ┌──────────┐         │   ┌─────────────────────┐             │
   │ 1. Safety│         │   │  SafetyLayer checks │             │
   │  Layer   │─────────┼──▶│  for prompt         │             │
   └──────────┘         │   │  injection attacks  │             │
        │               │   └──────────┬──────────┘             │
        ▼               │              │                         │
   ┌──────────┐         │              ▼                         │
   │ 2. Embed-│         │   ┌─────────────────────┐             │
   │  ding    │─────────┼──▶│  Convert task to    │             │
   │  Service │         │   │  1536-dim vector    │             │
   └──────────┘         │   └──────────┬──────────┘             │
        │               │              │                         │
        ▼               │              ▼                         │
   ┌──────────┐         │   ┌─────────────────────┐             │
   │ 3. Vector│         │   │  KD-tree nearest    │             │
   │  Database│─────────┼──▶│  neighbor search    │             │
   │          │         │   │  → top 20 candidates│             │
   └──────────┘         │   └──────────┬──────────┘             │
        │               │              │                         │
        ▼               │              ▼                         │
   ┌──────────┐         │   ┌─────────────────────┐             │
   │ 4. LLM   │         │   │  GPT-4o-mini (or    │             │
   │  Ranker  │─────────┼──▶│  Claude/llama.cpp)  │             │
   │          │         │   │  re-ranks top 10    │             │
   └──────────┘         │   │  results with scores│             │
        │               │   └──────────┬──────────┘             │
        ▼               │              │                         │
   ┌──────────┐         │              ▼                         │
   │ 5. Deter-│         │   ┌─────────────────────┐             │
   │  ministic│─────────┼──▶│  Remove drafts,     │             │
   │  Filter  │         │   │  apply constraints  │             │
   └──────────┘         │   │  score ≥ 0.5, max 5 │             │
        │               │   └──────────┬──────────┘             │
        ▼               │              │                         │
   ┌──────────┐         │              ▼                         │
   │ 6. Execu-│         │   ┌─────────────────────┐             │
   │  tion    │─────────┼──▶│  Sequential /       │             │
   │  Planner │         │   │  Parallel / Hybrid  │             │
   └──────────┘         │   └─────────────────────┘             │
        │               │                                       │
        ▼               └───────────────────────────────────────┘
   Response
   {
     selectedSkills: [...],
     executionPlan: { strategy, steps },
     confidence: 0.92
   }
```

### Stage-by-Stage Breakdown

**1. Safety Layer** — Before anything else, the router checks for prompt injection attacks. If the task text looks like it's trying to trick the system, the request is rejected immediately. This is the bouncer at the door.

**2. Embedding Service** — The task text gets converted into a 1536-dimensional vector using OpenAI's `text-embedding-3-small` model. This vector is a mathematical representation of the task's _meaning_ — not just individual words, but the semantic concept behind them.

> **Batch efficiency:** When generating embeddings for new skills, the router processes them in batches of 200 per API call. For 737 skills, this means just 4 API calls instead of 737. Total time: ~777ms.

**3. Vector Database** — The router maintains a KD-tree (k-dimensional tree) containing the embeddings of every skill. It searches this tree in O(log n) time to find the 20 most semantically similar skills. Because all embeddings are normalized to unit vectors, Euclidean distance equals cosine distance — the KD-tree naturally ranks by semantic similarity.

**4. LLM Ranker** — The top 20 candidates get sent to an LLM (gpt-4o-mini by default) for intelligent re-ranking. The LLM sees each skill's name and description alongside the original task, and returns a relevance score (0.0-1.0) with a short reason for each. This catches nuance that pure vector search might miss.

> **Caching:** Ranking results are cached by a deterministic hash of (task + candidate set). Identical queries return in microseconds instead of ~3 seconds.

**5. Deterministic Filter** — Applies hard rules:
- Removes skills marked as `draft: true` (stub quality gate)
- Caps at `maxSkills` (default 5, configurable)
- Filters by minimum score threshold (0.5 normal, 0.3 with LLM fallback)
- Ensures at least one skill always returns (fallback behavior)

**6. Execution Planner** — Decides _how_ to run the selected skills:
- **Sequential**: One skill, or dependent skills
- **Parallel**: Independent skills that can run simultaneously
- **Hybrid**: Mix of sequential and parallel steps

---

## Skill Loading: Where Skills Come From

The router has a two-tier skill loading system designed for scale.

```ascii
                    ┌─── SKILL LOADING PIPELINE ───┐
                    │                                │
                    │     ┌──────────────────┐       │
                    │     │  1. Remote Index │       │
                    │     │  (Primary path)  │       │
                    │     │                  │       │
                    │     │  Fetches         │       │
                    │     │  skills-index.json│      │
                    │     │  from GitHub     │       │
                    │     │  ← lightweight   │       │
                    │     │  (no git clone)  │       │
                    │     └────────┬─────────┘       │
                    │              │                  │
                    │              ▼                  │
                    │     ┌──────────────────┐       │
                    │     │ 2. On-Demand     │       │
                    │     │  Content Fetch   │       │
                    │     │                  │       │
                    │     │  Memory cache →  │       │
                    │     │  Local disk →    │       │
                    │     │  GitHub raw URL  │       │
                    │     └────────┬─────────┘       │
                    │              │                  │
                    │              ▼                  │
                    │     ┌──────────────────┐       │
                    │     │ 3. Fallback:     │       │
                    │     │  Git Clone       │       │
                    │     │  (if index fails)│       │
                    │     └────────┬─────────┘       │
                    │              │                  │
                    │              ▼                  │
                    │     ┌──────────────────┐       │
                    │     │ 4. Embedding     │       │
                    │     │  Generation      │       │
                    │     │  (batched, 200/  │       │
                    │     │   call)          │       │
                    │     └────────┬─────────┘       │
                    │              │                  │
                    │              ▼                  │
                    │     ┌──────────────────┐       │
                    │     │ 5. KD-tree Build │       │
                    │     │  O(log n) search │       │
                    │     │  ready            │       │
                    │     └──────────────────┘       │
                    │                                │
                    └────────────────────────────────┘
```

### Primary Path: Remote Index

1. On startup, the router fetches `skills-index.json` from GitHub raw content — a lightweight file containing metadata for every skill (name, description, domain, triggers).
2. No git clone needed. This is fast and bandwidth-efficient.
3. A periodic timer (default: every hour) re-fetches the index to discover newly pushed skills automatically.

### On-Demand Content

When a skill is needed:
1. **Memory cache** (fastest) — already loaded this session
2. **Disk cache** (fast) — persisted from a previous session
3. **GitHub raw** (slower but always available) — fetches the full SKILL.md from raw.githubusercontent.com

### Fallback: Git Clone

If the remote index is unreachable, the router clones the entire skills repository to a local directory and scans for SKILL.md files using glob patterns.

### Embedding Generation

Once skills are loaded, the router generates embeddings in batches of 200. The KD-tree is rebuilt from scratch after any reload to ensure the search index is always consistent.

---

## Skills: What They Are and How They're Organized

Skills are the heart of the system — self-contained Markdown documents that each contain specialized expertise for an AI agent.

```ascii
                    ┌── SKILL DIRECTORY STRUCTURE ──┐
                    │                                │
                    │ skills/                        │
                    │ ├── agent/          (255)      │
                    │ │   ├── confidence-based-      │
                    │ │   │   selector/SKILL.md      │
                    │ │   ├── task-decomposition/    │
                    │ │   │   SKILL.md               │
                    │ │   └── ...                    │
                    │ ├── cncf/           (171)      │
                    │ │   ├── kubernetes/SKILL.md    │
                    │ │   ├── prometheus/SKILL.md    │
                    │ │   └── ...                    │
                    │ ├── coding/          (82)       │
                    │ ├── go/              (12)       │
                    │ ├── linux/           (10)       │
                    │ ├── programming/      (4)       │
                    │ ├── trading/         (83)       │
                    │ └── writing/          (1)       │
                    │                                │
                    │        Total: 758 skills        │
                    └────────────────────────────────┘
```

### Anatomy of a Skill

Every SKILL.md file follows a strict format:

```yaml
---
name: risk-stop-loss              # Must match directory name
description: >                    # Single line, active verb
  Implements stop-loss strategies
  for algorithmic trading systems
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: trading
  role: implementation
  scope: implementation
  output-format: code
  triggers: stop loss, trailing stop,
    ATR stop, position protection,
    emergency stop, stop-loss
  related-skills: trading-risk-
    position-sizing, trading-risk-
    kill-switches
---
```

Then the content body:
```markdown
# Stop Loss Manager

Implements stop loss mechanisms to limit losses and protect capital.

## When to Use
- Implementing position risk controls for any position
- Designing a stop loss strategy for a new algorithm
- Choosing between stop types for a market condition

## When NOT to Use
- As the only risk control layer (layer with kill switches)

## Core Workflow
1. **Assess Market Regime** — Determine trending, ranging, or volatile
2. **Select Stop Type** — Choose strategy for the regime
3. **Calculate Stop Level** — Apply the formula

## Constraints
### MUST DO
- Layer an emergency stop on top of every other stop type
### MUST NOT DO
- Disable or bypass stops "temporarily"
```

### Trigger Auto-Discovery

The `metadata.triggers` field is what makes auto-loading work. When OpenCode detects trigger keywords in conversation, the matching skill is automatically injected into context — no manual `/skill` command needed.

| Trigger Style | Example | Catches |
|---|---|---|
| Technical term | `stop loss` | Domain experts |
| Abbreviation | `ATR` | Power users |
| Conversational | `how do i limit losses` | New users |
| Operational | `position protection` | Task-oriented queries |

---

## Link Following: Skills That Reference the Web

Skill documents can contain markdown links — both to local files (`[details](implementation.md)`) and to external URLs (`[docs](https://example.com)`). When enabled, the **MarkdownLinkResolver** automatically resolves these links and inlines the referenced content directly into the skill.

```ascii
              ┌── MARKDOWN LINK RESOLVER ──┐
              │                              │
              │  Skill content with links     │
              │  ---                          │
              │  See [details](deep-dive.md)  │
              │  Read [docs](example.com)     │
              │  ---                          │
              │         │                      │
              │         ▼                      │
              │  ┌─────────────────────┐       │
              │  │ Parse markdown      │       │
              │  │ links via regex     │       │
              │  └────────┬────────────┘       │
              │           │                      │
              │     ┌─────┴──────┐               │
              │     ▼            ▼                │
              │  Local         External           │
              │  ┌────────┐   ┌──────────────┐   │
              │  │Read    │   │ Static HTTP  │   │
              │  │file    │   │ (no JS)      │   │
              │  └────────┘   ├──────────────┤   │
              │               │ Puppeteer +  │   │
              │               │ Chromium     │   │
              │               │ (JS render)  │   │
              │               └──────┬───────┘   │
              │                      │            │
              │                      ▼            │
              │  ┌──────────────────────────┐     │
              │  │ Content Processing        │     │
              │  │                           │     │
              │  │ 1. Under threshold → inline│    │
              │  │ 2. Over threshold →        │    │
              │  │    compress or truncate    │    │
              │  │ 3. Semantic mode →         │    │
              │  │    embed chunks, find top-K│    │
              │  └──────────┬───────────────┘     │
              │             │                      │
              │             ▼                      │
              │  ┌──────────────────────────┐     │
              │  │ Inline as formatted      │     │
              │  │ reference section         │     │
              │  │ 📎 Reference: ...         │     │
              │  │ > Source: url             │     │
              │  └──────────────────────────┘     │
              │                              │
              └──────────────────────────────┘
```

### Resolution Modes

| Mode | Description | When to Use |
|---|---|---|
| `inline` (default) | Full content inlined as-is | Small references under 10KB |
| `semantic` | Chunk content → embed each chunk → find top-K most relevant excerpts via cosine similarity | Large docs; only want the parts relevant to the skill's context |
| `compressed` | LLM-style regex-based compression (brief ~2KB or moderate ~5KB) | Token-efficient referencing of medium-sized docs |

### External Fetch Strategies

When a link points to an external URL, the resolver tries multiple strategies:

1. **Static HTTP fetch** — Plain GET request with 5s timeout and 1MB hard limit. Always available.
2. **Puppeteer + Chromium JS rendering** — When `JS_RENDERING_ENABLED=true`, launches headless Chromium, navigates to the URL, waits 1s for dynamic content, and extracts the rendered HTML. Useful for SPAs, documentation sites that load content via JavaScript.
3. **JS fallback** — When `JS_RENDER_FALLBACK=true` (default), if JS rendering fails (Chromium not available, timeout, network error), it falls back to static fetch automatically.

> **Chromium in the container:** The Docker image includes Chromium (148.x) installed as an Alpine system package. Puppeteer is configured to find it at `/usr/bin/chromium-browser` with `PUPPETEER_SKIP_DOWNLOAD=true` to avoid redundant downloads.

### Local File References

Links to local files (relative to the skill's directory) are resolved by:
1. Resolving the path relative to the skill file's directory
2. **Path traversal protection** — Blocks paths that escape the skill base directory (e.g., `../../etc/passwd`)
3. **Circular reference detection** — Tracks visited paths per resolution call to prevent infinite loops
4. Recursively resolving links in the referenced content (up to `maxDepth`)

### Semantic Content Retrieval

When `LINK_RESOLUTION_MODE=semantic`, the resolver doesn't just inline the entire document — it finds the most relevant excerpts:

1. **Chunk** the external content into logical sections using the `ExternalContentChunker` (splits by headings, paragraphs, code blocks)
2. **Embed** each chunk using the same `EmbeddingService` that powers skill search
3. **Embed** the skill's own context (title + description + first 500 chars)
4. **Cosine similarity** search — find the top-K chunks most relevant to the skill
5. **Inline only those excerpts** — saving tokens while preserving meaning

This is particularly useful for large documentation pages where only a small portion is relevant to the specific skill.

### Safety & Limits

| Control | Default | Purpose |
|---|---|---|
| Path traversal protection | — | Blocks `../../` escapes from skill base directory |
| HTTPS-only | — | Only `https://` URLs allowed |
| Hard size limit | 1MB | Any content over 1MB is skipped entirely |
| Max depth | 2 | How deep to recursively resolve links |
| Circular reference | — | Per-call visited set prevents infinite loops |

### Configuration

| Variable | Default | Purpose |
|---|---|---|
| `LINK_FOLLOWING_ENABLED` | false | Master switch for link resolution |
| `ALLOW_EXTERNAL_LINKS` | false | Allow fetching external URLs |
| `MAX_LINK_DEPTH` | 2 | Max recursion depth for linked documents |
| `MAX_EXTERNAL_SIZE_KB` | 10 | Size threshold before compression applies |
| `EXTERNAL_COMPRESSION_MODE` | brief | brief / moderate / skip |
| `JS_RENDERING_ENABLED` | false | Enable Chromium for JS-rendered pages |
| `JS_RENDER_TIMEOUT_MS` | 5000 | Timeout per JS render attempt |
| `JS_RENDER_FALLBACK` | true | Fall back to static fetch if JS rendering fails |
| `LINK_RESOLUTION_MODE` | inline | inline / semantic / compressed |
| `SEMANTIC_TOP_K` | 3 | Number of relevant excerpts to return in semantic mode |
| `SEMANTIC_SIMILARITY_THRESHOLD` | 0.3 | Minimum cosine similarity for excerpt inclusion |

## MCP Integration: How OpenCode Talks to the Router

The MCP (Model Context Protocol) bridge is the glue that connects OpenCode to the Skill Router. It's a stdio-based Node.js process (`skill-router-mcp.js`) that exposes two tools to the AI agent.

```ascii
                 ┌── MCP INTEGRATION FLOW ──┐
                 │                           │
   ┌─────────┐   │                           │   ┌──────────────┐
   │         │   │   Stdio (JSON-RPC 2.0)    │   │              │
   │ OpenCode├───┼──────────────────────────▶│   │  skill-      │
   │  Agent  │   │   tools/list              │   │  router-mcp  │
   │         │   │   tools/call              │   │  .js         │
   └────┬────┘   │                           │   └──────┬───────┘
        │        │                           │          │
        │        └───────────────────────────┘          │
        │                                               │ HTTP
        │                                               │ :3000
        │                                               ▼
        │                                       ┌──────────────┐
        │                                       │  Skill Router│
        │                                       │  (Fastify)   │
        │                                       │              │
        │                                       │  POST /route │
        │                                       │  GET /skill/ │
        │                                       │  :name       │
        │                                       └──────────────┘
        │
        ▼
   Skill content injected
   into agent's context
   ───────────────────────
   # Skill: coding-
   security-review
   ...
   # Skill: coding-
   code-review
   ...
```

### The Two MCP Tools

**`route_to_skill(task)`** — Called at the beginning of every task:
1. Sends the task description to `POST /route`
2. Gets back a list of selected skills with scores
3. Fetches each skill's full content via `GET /skill/:name`
4. Falls back to local disk if the router is unreachable
5. Returns all skill content as a single text block

**`list_skills()`** — Lists all available skills with names, categories, and descriptions. Used for discovery and exploration.

### What Happens When the Router Is Down

The MCP bridge is resilient:
- If `/route` returns `ECONNREFUSED`, it returns a friendly message: "Skill router is not running at http://localhost:3000. Start it with: docker start skill-router"
- Content has a disk fallback — if the router can't serve `/skill/:name`, the bridge reads from a local `skills/` directory
- The API doc (`skill-router-api.md`) is auto-synced from GitHub every hour

---

## Vector Search: The Semantics Engine

The VectorDatabase class manages semantic search using a custom KD-tree implementation.

### How Embeddings Work

1. Each skill gets a 1536-dimensional vector from `text-embedding-3-small`
2. The vector captures the _meaning_ of the skill's name, description, and tags
3. All vectors are normalized to unit length (L2 normalization)
4. For unit vectors: **Euclidean distance = cosine distance** (the math works out: `||a-b||² = 2 - 2·cos(θ)`)

### Embedding Resilience: Fallback & Emulation

The EmbeddingService uses a three-tier strategy to guarantee the system works without any API keys.

```
                                          EMBEDDING GENERATION TIERS
                                                  
                    ┌─ TIER 1 ──────────────────────────────┐
                    │  OpenAI / llama.cpp Embeddings API     │
                    │  (/v1/embeddings)                      │
                    │  text-embedding-3-small (1536d)        │
                    └──────────────┬────────────────────────┘
                                   │ failed?
                                   ▼
                    ┌─ TIER 2 ──────────────────────────────┐
                    │  LLM Embedding Emulation              │
                    │  Ask ANY chat LLM to produce a         │
                    │  JSON array of floats via text prompt  │
                    │  (64 dimensions, parse + validate)     │
                    │  Retries: 3 with exponential backoff   │
                    └──────────────┬────────────────────────┘
                                   │ failed?
                                   ▼
                    ┌─ TIER 3 ──────────────────────────────┐
                    │  Deterministic Hash-Based Fallback     │
                    │  Always works, no external deps        │
                    │  Algorithmic: hash → LCG → normalize   │
                    │  Consistent across restarts            │
                    └────────────────────────────────────────┘
```

**Tier 1: Direct Embeddings API (Default)**

The router first tries the standard embeddings endpoint:
- **OpenAI** — `text-embedding-3-small` (1536 dimensions) via `POST /v1/embeddings`
- **llama.cpp** — any local embedding model via the same endpoint format

Texts are processed in batches of up to 100 (configurable via `batchSize`) per API call, dramatically reducing round-trips.

**Tier 2: LLM Embedding Emulation**

When no embeddings-specific API is available but a chat LLM is, set `EMBEDDING_PROVIDER=emulation`. This asks **any LLM** (OpenAI, Anthropic, llama.cpp, vLLM, LiteLLM, ollama...) to generate embeddings through a carefully engineered text prompt:

```
System prompt: "You are an embedding generator. Output ONLY a JSON array of floats."
User prompt: "Represent the following text as a JSON array of 64 floats
capturing its semantic meaning. Output only the array, no additional text.

Text to embed: \"deploy a kubernetes cluster to production\""
```

**How it works:**

1. Sends the prompt + text to the configured LLM's `/v1/chat/completions` endpoint
2. The LLM returns a JSON array of 64 floating-point numbers
3. The service parses the response, validates exactly 64 floats, all within [-1, 1]
4. **If JSON parsing fails**: attempts regex extraction to find the array in the text
5. **If all parsing fails**: falls through to Tier 3 (deterministic fallback)
6. **Retries**: up to 3 attempts with exponential backoff (100ms → 200ms → 400ms)

**Why 64 dimensions instead of 1536?** LLMs struggle to reliably output 1536 numbers in a single response — the output frequently gets truncated or malformed. 64 dimensions is a practical compromise: small enough for consistent generation, large enough for meaningful semantic comparisons.

**Tier 3: Deterministic Hash-Based Fallback**

If all else fails (no API key, network error, LLM timeout), the router generates embeddings using a purely algorithmic method:

```
hash = 0
for each character:  hash = (hash << 5) - hash + charCode
seed = |hash|
LCG loop: value = (value × 9301 + 49297) % 233280  →  normalize to [-1, 1]
L2 normalize the entire vector
```

This produces a **consistent, deterministic embedding** for the same text across restarts. It's not semantically meaningful, but it guarantees:
- The router starts and runs with zero configuration
- Similar texts get similar vectors (good enough for basic routing)
- Zero external dependencies, network calls, or API keys required

**Emulation Configuration:**

| Variable | Default | Purpose |
|---|---|---|
| `EMBEDDING_PROVIDER` | openai | Set to `emulation` to enable LLM-based embedding |
| `EMBEDDING_MODEL` | gpt-4o-mini | Which chat LLM to ask for embeddings |
| `EMBEDDING_PROMPT_TEMPLATE` | (built-in) | Custom prompt template for emulation |
| `EMBEDDING_MAX_RETRIES` | 3 | Retries before deterministic fallback |
| `EMBEDDING_DIMENSIONS` | 1536 | Embedding dimensions (64 in emulation mode) |

### The KD-Tree

A k-dimensional tree partitions the vector space recursively, splitting on alternating dimensions at the median point. This creates a balanced binary tree that supports O(log n) nearest-neighbor search.

```ascii
                ┌── KD-TREE SEARCH ──┐
                │                     │
   Building:    │   points.sort(axis) │
                │   median = root     │
                │   left = smaller    │
                │   right = larger    │
                │                     │
   Searching:   │   query = task vec  │
                │   walk tree by axis │
                │   track best k      │
                │   prune far subtree │
                │   return top 20     │
                │                     │
                └─────────────────────┘

   Key insight: For unit vectors, Euclidean distance in the
   KD-tree gives the same ranking as cosine similarity,
   but in O(log n) instead of O(n).
```

### Why KD-Tree Over Brute Force?

| Approach | Time | At 750 skills | At 1,800 skills |
|---|---|---|---|
| Brute force (linear scan) | O(n) | 750 comparisons | 1,800 comparisons |
| KD-tree | O(log n) | ~10 comparisons | ~11 comparisons |

The KD-tree returns 20 candidates, which are then re-ranked by the LLM. This hybrid approach gives you the speed of vector search with the intelligence of LLM judgment.

---

## LLM Ranking: The Final Arbiter

Vector search finds semantically similar skills, but it can miss nuance. That's where the LLM Ranker comes in.

### The Ranking Prompt

The LLM receives a structured prompt:

```
Task: "review this Python code for SQL injection vulnerabilities"

Candidate skills:
1. coding-code-review: Comprehensive code review methodology...
2. coding-security-review: Security-focused code review patterns...
3. coding-python-best-practices: Python-specific coding patterns...
...

Rank these skills by relevance to the task.

Return ONLY this JSON:
{
  "rankings": [
    {"skillName": "coding-security-review", "score": 0.95, "reason": "SQL injection is a security concern"},
    {"skillName": "coding-code-review", "score": 0.75, "reason": "General code review practices apply"},
    ...
  ]
}
```

### Three Provider Options

| Provider | Model | When to Use |
|---|---|---|
| **OpenAI** (default) | gpt-4o-mini | Cloud, best quality |
| **Anthropic** | Claude 3.5 Haiku | Cloud, different pricing |
| **llama.cpp** | Local model (e.g., Qwen3) | Offline, no API key |

### Fallback

If the LLM is unavailable (network error, API outage), the router stays operational:

1. **Fallback ranking**: Returns the top vector search candidate with score 0.3 and reason "LLM unavailable, using default"
2. **No panic**: The deterministic filter ensures at least one skill is always returned

### Reasoning Model Support

When using reasoning models like Qwen3 or DeepSeek (which output thinking/reasoning tokens before the answer), the LLMRanker uses **brace-counting JSON extraction**:

```
scan response character by character
track brace depth { } and string state "..."
find matching closing brace for the outermost object
extract complete JSON even with thinking text prepended
```

This means you can route through Qwen3 or Claude 3.5 Sonnet and the router correctly strips the reasoning tokens, extracting only the JSON ranking response. If JSON extraction fails entirely, it falls back to line-by-line regex parsing of the raw text.

### Caching

Ranking results are cached by a deterministic hash of the task + candidate set. This prevents redundant LLM calls when the same task (or a very similar one) arrives again. Cache hit response: microseconds instead of ~3 seconds.

---

## Skill Compression: Saving Tokens Without Losing Meaning

Skills can be long — some are 10K+ characters. Loading multiple full skills into an AI agent's context window burns tokens quickly. The SkillCompressor solves this with two strategies.

### Regex-Based Compression

Progressive compression levels (0-10+) that remove increasingly non-essential content:

| Level | What's Removed | Savings |
|---|---|---|
| 0 | Nothing (original content) | 0% |
| 1 | Blank lines | ~5% |
| 2 | "When to Use" section | ~12% |
| 3 | "When NOT to Use" section | ~18% |
| 4 | Collapse "Core Workflow" to paragraph | ~28% |
| 5 | Remove related-skills table | ~35% |
| 6 | Remove markdown formatting | ~42% |
| 7 | Remove code examples | ~55% |
| 8 | Abbreviate section names | ~68% |
| 9 | Combine all sections | ~75% |
| 10+ | Summary only (first 200 chars) | ~85% |

### LLM-Based Compression

An LLM intelligently summarizes skill content while preserving key instructions. Supports three version hints:

| Version | Description | Use Case |
|---|---|---|
| `brief` | Short summary | Quick lookup |
| `moderate` | Balanced compression | Default |
| `detailed` | Preserve most content | Complex tasks |

### Cache Architecture

```
┌─────────────────────────────────────────────┐
│           COMPRESSION CACHE LAYERS            │
│                                               │
│  ┌──────────────────┐  84% hit rate           │
│  │ In-Memory (LRU)  │  1GB max               │
│  │  1hr TTL (cold)  │                        │
│  │  30min TTL (hot) │                        │
│  └────────┬─────────┘                        │
│           │ miss                               │
│           ▼                                   │
│  ┌──────────────────┐  7-day TTL             │
│  │ Disk Cache       │  Lazy-write every 5s   │
│  └────────┬─────────┘                        │
│           │ miss                               │
│           ▼                                   │
│  ┌──────────────────┐                        │
│  │ Original Content  │  From GitHub / disk    │
│  └──────────────────┘                        │
│                                               │
│  Adaptive TTL: hot skills (top 100) get       │
│  30min TTL, cold skills get 1hr. Hot skills   │
│  are protected from LRU eviction.             │
└─────────────────────────────────────────────┘
```

---

## API Endpoints: Talking to the Router Directly

The router exposes a Fastify HTTP API. Here's every endpoint:

### Health & Status

```bash
# Check if the router is alive (always 200, even during loading)
curl http://localhost:3000/health
# → {"status":"healthy","ready":true,"timestamp":"...","version":"1.0.0"}

# Get statistics: skill count, categories, MCP tools
curl http://localhost:3000/stats
# → {"skills":{"totalSkills":758,"categories":8,...},"mcpTools":{...}}
```

### Skills

```bash
# List all loaded skills
curl http://localhost:3000/skills
# → {"total":758,"skills":[{name, category, description, tags, ...}]}

# Get a single skill's full content
curl http://localhost:3000/skill/coding-security-review
# → Full SKILL.md as plain text

# With compression
curl "http://localhost:3000/skill/coding-security-review?compression=moderate"
```

### Routing

```bash
# Route a task to the best skills
curl -X POST http://localhost:3000/route \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Deploy a Kubernetes manifest to production",
    "context": {"environment": "production"},
    "constraints": {"maxSkills": 3}
  }'
# → {selectedSkills: [...], executionPlan: {...}, confidence: 0.92, ...}

# Execute specific skills with inputs
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Deploy to K8s",
    "skills": ["cncf-kubernetes"],
    "inputs": {"manifest": "..."}
  }'
```

### Maintenance

```bash
# Force reload skills from GitHub
curl -X POST http://localhost:3000/reload

# View last 100 routing requests
curl http://localhost:3000/access-log

# Compression metrics
curl http://localhost:3000/metrics

# Read link following config
curl http://localhost:3000/config/link-following

# Update link following settings
curl -X POST http://localhost:3000/config/link-following \
  -H "Content-Type: application/json" \
  -d '{"max_depth": 3, "link_following_enabled": true}'
```

---

## Docker Deployment: Running the Router

```ascii
                ┌── DOCKER SETUP ──┐
                │                   │
                │  docker run       │
                │  skill-router     │
                │                   │
                │  Port 3000 ───────┤──► HTTP API
                │                   │
                │  Skills from:     │
                │  ┌─────────────┐  │
                │  │ GitHub raw  │  │  ← Primary (lightweight index)
                │  │ (remote)    │  │
                │  ├─────────────┤  │
                │  │ Local disk  │  │  ← Fallback (git clone)
                │  │ (mounted)   │  │
                │  └─────────────┘  │
                │                   │
                │  Caches:          │
                │  /cache           │  ← Persisted compressions
                │  /app/cache/      │
                │   compressed      │
                │                   │
                │  SSH agent        │
                │  forwarding for   │
                │  private repos    │
                └───────────────────┘
```

### Quick Start

```bash
# Clone and install
git clone https://github.com/paulpas/agent-skill-router
cd agent-skill-router
./install-skill-router.sh

# Or start manually
docker run -d \
  --name skill-router \
  -p 3000:3000 \
  -e OPENAI_API_KEY=sk-... \
  skill-router:latest
```

### Container Details

| Aspect | Value |
|---|---|
| Base image | node:24-alpine |
| Image size | ~757MB (includes Chromium) |
| Health check | GET /health every 60s, 90s startup period |
| User | Non-root `appuser` |
| Entrypoint | Fixes volume permissions, drops privileges |
| Startup time | ~1.27s with compression warmup |

The container supports SSH agent forwarding for private git repos, has Chromium installed for JS-rendered markdown link resolution, and uses an entrypoint script that fixes volume permissions before switching to a non-root user.

---

## Performance Numbers

Because engineers love benchmarks:

| Operation | Performance |
|---|---|
| Embedding generation (737 skills, batched) | ~777ms total (50-130x faster than per-skill calls) |
| Startup with compression warmup (50 skills) | ~1.27s |
| KD-tree vector search | O(log n) — ~10 comparisons for 1,500+ skills |
| LLM ranking round-trip | ~3s (cached identically in microseconds) |
| Embedding dimension | 1536 (text-embedding-3-small) |
| Scale target | 1,827+ skills with 84% cache hit rate |
| Memory footprint | ~1.1GB for 1,075 loaded skills |
| Cache hit rate (full scale) | 84% verified |

---

## Creating a New Skill

Skills are so easy to create that the router includes an auto-generation tool.

### Manual Creation

```bash
mkdir -p skills/trading/risk-stop-loss
# Edit skills/trading/risk-stop-loss/SKILL.md
# Follow the frontmatter format above
```

### Auto-Generation

```bash
./scripts/skill-generate.sh "Generate a skill about kubernetes networking"

# Or specify domain and name
./scripts/skill-generate.sh "Add a Go concurrency pattern for rate limiting" \
    -d go -n rate-limiting
```

The generator queries the router for relevant existing skills, fetches the format specification, sends everything to a local LLM, validates the output, and saves the file — all in one pass.

### Quality Validation

Every skill is validated against stub detection rules:

```bash
./scripts/validate_skill.sh skills/trading/risk-stop-loss/SKILL.md
# → Exit code 0 = PASS, 1 = FAIL
# Requires: ≥3000 bytes, real code examples, no placeholder text,
#            specific triggers, proper frontmatter
```

---

## Configuration Reference

Key environment variables for fine-tuning the router:

### Core

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | 3000 | HTTP server port |
| `SKILLS_DIRECTORY` | ./samples/skill-definitions | Local skills path |
| `LLM_PROVIDER` | openai | openai / anthropic / llamacpp |
| `LLM_MODEL` | gpt-4o-mini | Model for skill ranking |
| `MAX_SKILLS` | 5 | Max skills per route response |

### Embeddings

| Variable | Default | Purpose |
|---|---|---|
| `EMBEDDING_PROVIDER` | openai | Embedding service provider |
| `EMBEDDING_MODEL` | text-embedding-3-small | Embedding model (1536d) |

### GitHub Sync

| Variable | Default | Purpose |
|---|---|---|
| `GITHUB_SKILLS_ENABLED` | true | Enable remote index fetch |
| `GITHUB_RAW_BASE_URL` | raw.githubusercontent.com/paulpas/skills/main | URL for skills-index.json |
| `SKILL_SYNC_INTERVAL` | 3600 | Seconds between index syncs |

### Compression

| Variable | Default | Purpose |
|---|---|---|
| `COMPRESSION_CACHE_SIZE_MB` | 1024 | In-memory cache (1GB) |
| `COMPRESSION_WARMUP_SKILLS` | 50 | Skills to pre-compress on startup |
| `COMPRESSION_BATCH_SIZE` | 10 | Skills per compression batch |
| `COMPRESSION_ADAPTIVE_TTL` | true | Hot skills get 30min, cold get 1hr |

### Link Following

| Variable | Default | Purpose |
|---|---|---|
| `LINK_FOLLOWING_ENABLED` | false | Enable markdown link resolution |
| `JS_RENDERING_ENABLED` | false | Enable JS rendering via Chromium |
| `MAX_LINK_DEPTH` | 2 | Max recursion depth for links |

---

## Why This Is Cool

The Skill Router solves a fundamental problem with AI agents: **they're generalists by default**. A raw model knows a little about everything but isn't deeply expert in any domain. Loading every possible instruction would blow through context windows in seconds.

The router gives AI agents **just-in-time expertise**:

- **No manual commands needed** — trigger keywords auto-detect what you're working on
- **Semantic understanding** — you don't need to know the exact skill name, just describe what you want to do
- **750+ domains covered** — from Kubernetes to algorithmic trading to code review
- **Token-efficient** — compression saves 28-85% on skill content
- **Fault-tolerant** — falls back gracefully if LLM, network, or GitHub are unavailable
- **Self-updating** — periodic sync discovers new skills automatically
- **Trivially extensible** — add a markdown file and it's instantly available

```ascii
  Without Router:                          With Router:
  ┌──────────────────┐                    ┌──────────────────┐
  │  "review this    │                    │  "review this    │
  │   code"           │                    │   code"           │
  │                   │                    │                   │
  │  AI: "I'll do    │                    │  AI routes →      │
  │  my best but I'm │                    │  coding-code-     │
  │  not a security  │                    │  review skill     │
  │  expert"          │                    │  loads expert     │
  │                   │                    │  constraints      │
  │  ▓▓▓▓░░░░ 60%    │                    │  ▓▓▓▓▓▓ 95%       │
  └──────────────────┘                    └──────────────────┘
```

The Agent Skill Router transforms an LLM from a helpful generalist into a domain specialist — on demand, automatically, and at scale.

---

> **Learn more:** [AGENTS.md](./AGENTS.md) — complete guide to creating skills
>
> **Quick start:** `./install-skill-router.sh` — interactive installation
>
> **Stat:** 758 skills, 8 domains, 84% cache hit rate, ~1.27s startup
