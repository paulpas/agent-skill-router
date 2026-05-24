# Skill Router — Show and Tell

**What happens when an AI needs the right expertise, and it needs it now.**

The Agent Skill Router is a smart routing engine that matches user tasks to specialized "skill" documents loaded by OpenCode AI agents. Think of it as a GPS for AI expertise: you tell the router what you want to do, and it finds the right set of instructions to make the AI an expert in that domain.

```mermaid
---
config:
  theme: neutral
---
sequenceDiagram
    participant User
    participant OC as OpenCode Agent
    participant Router as Skill Router :3000
    participant Skills as Skill Library

    User->>OC: "review this Python code for SQL injection"
    OC->>Router: route_to_skill("review this code")
    Router->>Skills: Query HNSW index
    Skills-->>Router: Top matching skills
    Router-->>OC: code-review (0.95), security-review (0.88)
    OC->>OC: Inject skills into context
    Note over OC: # Skill: coding-security-review<br/>OWASP Top 10 patterns<br/>SQL injection detection
```

---

## Table of Contents

**◈ TIER 1: HIGH-LEVEL**
- [What Is This Thing?](#what-is-this-thing)
- [How It Works: The Routing Pipeline](#how-it-works-the-routing-pipeline)
- [Why This Is Cool](#why-this-is-cool)
- [Performance Numbers](#performance-numbers)

**◈ TIER 2: DEEP DIVES**
- [Skills: What They Are and How They're Organized](#skills-what-they-are-and-how-theyre-organized)
- [Stage 1: Safety Layer — Prompt Injection Defense](#stage-1-safety-layer--prompt-injection-defense)
- [Vector Search: The Semantics Engine](#vector-search-the-semantics-engine)
- [LLM Ranking: The Final Arbiter](#llm-ranking-the-final-arbiter)
- [Skill Loading: Where Skills Come From](#skill-loading-where-skills-come-from)
- [MCP Integration: How OpenCode Talks to the Router](#mcp-integration-how-opencode-talks-to-the-router)
- [Skill Compression: Saving Tokens Without Losing Meaning](#skill-compression-saving-tokens-without-losing-meaning)
- [Link Following: Skills That Reference the Web](#link-following-skills-that-reference-the-web)

**◈ TIER 3: REFERENCE**
- [API Endpoints: Talking to the Router Directly](#api-endpoints-talking-to-the-router-directly)
- [Docker Deployment: Running the Router](#docker-deployment-running-the-router)
- [Creating a New Skill](#creating-a-new-skill)
- [Configuration Reference](#configuration-reference)

---

### ◈ TIER 1: HIGH-LEVEL

## What Is This Thing?

The Skill Router is a TypeScript application that runs in a Docker container and acts as a **middleman between AI agents and specialized knowledge**. It manages a library of 911 "skill" documents — markdown files that each contain expert instructions for a specific domain.

When an AI agent receives a task (like "review this code for security issues"), the router:

1. **Understands** what the task is really about (via semantic embeddings)
2. **Finds** the most relevant skills from its library (via vector search)
3. **Ranks** them to pick only the best matches (via an LLM judge)
4. **Delivers** the skill content back into the AI's context

The result: the AI agent suddenly _knows_ how to be a security code reviewer, a Kubernetes deployment expert, or an algorithmic trading developer — all without you needing to load anything manually.

```mermaid
---
config:
  theme: neutral
---
flowchart LR
    User["You"] -->|"review this Python code for SQL injection"| Router["Router :3000"]
    Router --> Skills["Skill Library<br/>code-review<br/>security-review<br/>kubernetes<br/>vwap<br/>... 900+ more"]
    Router -->|"Full expert skill content injected"| User
```

### Where It Lives

```
┌──────────────────┬──────────────────────────────────┐
│ Layer            │ Technology                       │
├──────────────────┼──────────────────────────────────┤
│ Runtime          │ Node.js 24 on Alpine Linux        │
│ Web framework    │ Fastify                           │
│ Vector search    │ Custom HNSW graph (ANN)             │
│ Embeddings       │ OpenAI text-embedding-3-small      │
│ LLM ranking      │ OpenAI / Anthropic / llama.cpp    │
│ Deployment       │ Docker (node:24-alpine, ~757MB)   │
│ Port             │ 3000                              │
└──────────────────┴──────────────────────────────────┘
```

---

## How It Works: The Routing Pipeline

The core routing logic lives in `src/core/Router.ts`. When you send a task to `/route`, it goes through a multi-signal hybrid scoring pipeline:

```mermaid
---
config:
  theme: neutral
---
flowchart TD
    Input["POST /route<br/>{ 'task': '...' }"] --> S1

    subgraph S1Box["1. Safety Layer ~0.1ms"]
        direction TB
        S1["Check prompt injection<br/>Validate task length<br/>Enforce allowlists"]
    end

    S1 --> S2

    subgraph S2Box["2. Hybrid Retrieval ~200ms"]
        direction TB
        S2a["Vector embedding (50%)"]
        S2b["BM25 exact-term (20%)"]
    end

    S2 --> S3

    subgraph S3Box["3. Archetype + Trigger ~0.1ms"]
        direction TB
        S3a["Trigger match (15%)"]
        S3b["Archetype alignment (10%)"]
        S3c["Anti-trigger penalty"]
    end

    S3 --> S4

    subgraph S4Box["4. MMR Diversify ~0.1ms"]
        direction TB
        S4["Reduce near-duplicate skills<br/>lambda=0.7"]
    end

    S4 --> S5

    subgraph S5Box["5. LLM Ranker ~3s (optional)"]
        direction TB
        S5["Re-rank when<br/>LLM_RANKING_ENABLED=true"]
    end

    S5 --> S6

    subgraph S6Box["6. Filter + Plan ~0.1ms"]
        direction TB
        S6a["Score >= 0.5"]
        S6b["Cap at maxSkills"]
        S6c["Strategy: seq/par/hy"]
    end

    S6 --> Output["Selected: hybrid scored + diversified skills<br/>with score breakdown"]
```

> 💡 **Reading guide:** The hybrid scoring pipeline above is the heart of the router. Each stage has a deep-dive section later in this document. Stick around for the high level, or jump to any stage that interests you.

### What Each Stage Does (brief)

Use this as a roadmap — each stage has its own deep-dive section below.

1. **Safety Layer** — Checks for prompt injection, validates task length, enforces allowlists. [→ Full deep-dive](#stage-1-safety-layer--prompt-injection-defense)
2. **Embedding Service** — Converts the task into a 1536-dimension vector capturing semantic meaning. [→ Full deep-dive](#vector-search-the-semantics-engine)
3. **Vector Database** — Searches an HNSW approximate nearest neighbor graph for the 20 most similar skills (~1ms). [→ Full deep-dive](#vector-search-the-semantics-engine)
4. **LLM Ranker** — An LLM intelligently re-ranks the top candidates with relevance scores. [→ Full deep-dive](#llm-ranking-the-final-arbiter)
5. **Deterministic Filter** — Applies hard rules: remove drafts, cap at maxSkills, enforce score thresholds.
6. **Execution Planner** — Decides sequential, parallel, or hybrid execution.

---

## Why This Is Cool

The Skill Router solves a fundamental problem with AI agents: **they're generalists by default**. A raw model knows a little about everything but isn't deeply expert in any domain. Loading every possible instruction would blow through context windows in seconds.

The router gives AI agents **just-in-time expertise**:

- **No manual commands needed** — trigger keywords auto-detect what you're working on
- **Semantic understanding** — you don't need to know the exact skill name, just describe what you want to do
- **900+ domains covered** — from Kubernetes to algorithmic trading to code review
- **Token-efficient** — compression saves 28-85% on skill content
- **Fault-tolerant** — falls back gracefully if LLM, network, or GitHub are unavailable
- **Self-updating** — periodic sync discovers new skills automatically
- **Trivially extensible** — add a markdown file and it's instantly available

```mermaid
---
config:
  theme: neutral
---
flowchart LR
    subgraph Without["Without Router"]
        direction TB
        W1["User: 'review this code'"]
        W2["AI: 'I'll do my best<br/>but I'm not a security expert'"]
        W3["Result: generic advice<br/>Confidence: 60%"]
        W1 --> W2 --> W3
    end

    subgraph With["With Router"]
        direction TB
        R1["User: 'review this code'"]
        R2["OpenCode routes to<br/>code-review skill"]
        R3["Result: OWASP-grounded<br/>analysis with CWE refs<br/>Confidence: 95%"]
        R1 --> R2 --> R3
    end
```

The Agent Skill Router transforms an LLM from a helpful generalist into a domain specialist — on demand, automatically, and at scale.

---

## Performance Numbers

Because engineers love benchmarks:

| Operation | Performance |
|---|---|
| Embedding generation (737 skills, batched) | ~777ms total (50-130x faster than per-skill calls) |
| Startup with compression warmup (50 skills) | ~1.27s |
| HNSW vector search | ~1ms (18× faster than brute-force) |
| LLM ranking round-trip | ~3s (cached identically in microseconds) |
| Embedding dimension | 1536 (text-embedding-3-small) |
| Scale target | 1,827+ skills with 84% cache hit rate |
| Memory footprint | ~1.1GB for 1,075 loaded skills |
| Cache hit rate (full scale) | 84% verified |

---

### ◈ TIER 2: DEEP DIVES

## Skills: What They Are and How They're Organized

Skills are the heart of the system — self-contained Markdown documents that each contain specialized expertise for an AI agent.

```mermaid
---
config:
  theme: neutral
---
flowchart TD
    Root["skills/"] --> Agent["agent/ (255)"]
    Root --> Cncf["cncf/ (171)"]
    Root --> Coding["coding/ (82)"]
    Root --> Go["go/ (12)"]
    Root --> Linux["linux/ (10)"]
    Root --> Prog["programming/ (4)"]
    Root --> Trading["trading/ (83)"]
    Root --> Writing["writing/ (1)"]
    Total["Total: 758 skills"] -.-> Root
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

```mermaid
---
config:
  theme: neutral
---
flowchart LR
    User["User says:<br/>'help with stop loss'"] --> Router["Router scans metadata:"]
    Router --> Match["trading-risk-stop-loss<br/>triggers: stop loss, trailing stop,<br/>emergency stop, ATR, position prot."]
    Match -->|"MATCH: 'stop loss' found!"| Load["Auto-loading skill..."]
    Load --> Inject["Skill injected into agent context"]
```
| Trigger Style | Example | Catches |
|---|---|---|
| Technical term | `stop loss` | Domain experts |
| Abbreviation | `ATR` | Power users |
| Conversational | `how do i limit losses` | New users |
| Operational | `position protection` | Task-oriented queries |

---

## Stage 1: Safety Layer — Prompt Injection Defense

The safety layer lives in `src/core/SafetyLayer.ts` (424 lines) and is invoked as Stage 1 in `src/core/Router.ts` — before embeddings are generated, before skill search begins, before anything else touches the request. If the task is malicious, it never reaches the rest of the pipeline.

```mermaid
---
config:
  theme: neutral
---
flowchart TD
    Input["POST /route<br/>{ 'task' }"] --> Checks
    subgraph Checks["Safety Layer Checks"]
        direction TB
        C1["1. Task length check (max 10K)"]
        C2["2. Prompt injection scan (Tier 1)"]
        C3["3. Skill allowlist check"]
        C4["4. Schema validation"]
    end
    Checks --> Decision{"Safe?"}
    Decision -->|"Yes"| Safe["-> Stage 2: Embedding"]
    Decision -->|"No"| Unsafe["-> 403 Rejected + error message"]
```
### Two-Tier Detection Architecture

**Tier 1: Regex Pattern Matching (always-on)** — Three independent categories of high-specificity patterns. Each category is self-contained: one match per category counts as one signal. No single category is enough to block on its own (unless `SAFETY_STRICT=true`).

- **Prompt Hijacking** — Detects instruction override attempts:
  - `ignore all previous instructions`, `disregard prior instructions`
  - `you are now DAN mode`, `you are now a different AI`
  - `override system prompt`, `bypass safety filter`
  - `pretend you have no restrictions`, `pretend there are no limits`
  - `your new instructions are...`, `your new role is...`

- **Command Injection** — Catches shell metacharacters in execution context:
  - Backtick substitution: `` `rm -rf /` ``, `` `wget evil.com` ``
  - `$(...)` command substitution: `$(curl malicious.com)`
  - Pipe-to-shell: `... | sh`, `... | bash`
  - Chained destructive commands: `&& rm -rf /`, `&& wget`, `&& curl`

- **Credential Harvesting** — Spots requests for secrets:
  - `output your API key`, `reveal your password`
  - `verify your credentials`, `verify the token`
  - `what is your secret`, `show your API key`
  - `leak your password`, `send me your token`

Patterns are deliberately high-specificity to avoid false positives on legitimate developer task descriptions like `review code for security issues` or `use dependency injection in this service`.

**Tier 2: LLM-Based Detection (available, not default)** — Defined in `src/llm/prompt.ts`, a reusable prompt template (`PROMPT_INJECTION_PROMPT`) asks the LLM to check three vectors — prompt injection, code injection, and social engineering — returning structured JSON:

```json
{
  "isSafe": boolean,
  "riskLevel": "low" | "medium" | "high" | "critical",
  "flags": ["flag1", "flag2"]
}
```

This tier is available for integration when needed but is not activated by default. The regex-based Tier 1 covers the vast majority of attacks with zero latency and no API cost.

### The 2-Signal Rule

The default `BLOCK_THRESHOLD` is 2, controlled by the `SAFETY_STRICT` environment variable:

| Signals | Default Behavior | `SAFETY_STRICT=true` |
|---------|-----------------|----------------------|
| **0** | Allow through | Allow through |
| **1** | Warn + allow (single patterns can trigger on legitimate text like "how do I protect my API key") | Block (strict mode) |
| **2+** | Block (multiple independent categories is a strong attack signal) | Block |

The 2-signal default exists because a single pattern can match legitimate task descriptions. For instance, `verify your password` could be a credential-harvesting attempt or a developer asking the AI to audit password handling. Two signals from different categories (e.g., hijacking + command injection) is far more likely to be a real attack.

The `SAFETY_STRICT=true` environment variable drops the threshold to 1 — any single detection signal blocks the request. Use this for paranoid deployments where false positives are preferable to false negatives.

### Additional Defenses

The same `SafetyLayer` class provides four more layers of protection:

- **Task length validation**: Max 10,000 characters (`maxTaskLength`). Prevents oversized input attacks designed to exhaust memory or bypass filters through sheer volume.
- **Skill allowlist** (`skillAllowlist`): An optional restricted list of allowed categories or skill names. Requests targeting disallowed categories or skills are rejected early, limiting blast radius in case of compromised access.
- **Input sanitization** (`sanitizeInputs`): Recursively neuters dangerous function calls in execution inputs — `eval()` becomes `eval_blocked()`, `exec()` becomes `exec_blocked()`, `system()` becomes `system_blocked()`. Applied to strings, arrays, and nested objects via a recursive sanitizer.
- **Schema validation** (`validateSchema`): When `requireSchemaValidation` is enabled, checks that execution inputs match the expected skill input schema — required fields are present, types match. Returns clear error messages on mismatch.

### Configuration

```typescript
// RouterConfig.safety — embedded in the router constructor
{
  safety: {
    enablePromptInjectionFilter: true,   // Master switch for Tier 1 scanning
    requireSchemaValidation: true,        // Enable/disable schema checks
  }
}
```

The `enablePromptInjectionFilter` option (default: `true`) controls whether injection scanning runs at all. The `requireSchemaValidation` option (default: `true`) controls schema checking on execution inputs. Set the `SAFETY_STRICT` environment variable to `true` to block on any single detection signal instead of the default 2-signal threshold.

---

## Vector Search: The Semantics Engine

The VectorDatabase class manages semantic search using an HNSW (Hierarchical Navigable Small World) graph — a modern approximate nearest neighbor (ANN) algorithm.

### How Embeddings Work

1. Each skill gets a 1536-dimensional vector from `text-embedding-3-small`
2. The vector captures the _meaning_ of the skill's name, description, and tags
3. All vectors are normalized to unit length (L2 normalization)
4. For unit vectors: **Euclidean distance = cosine distance** (the math works out: `||a-b||² = 2 - 2·cos(θ)`)

> **Batch efficiency:** When generating embeddings for new skills, the router processes them in batches of 200 per API call. For 737 skills, this means just 4 API calls instead of 737. Total time: ~777ms.

### Embedding Resilience: Fallback & Emulation

The EmbeddingService uses a three-tier strategy to guarantee the system works without any API keys.

```mermaid
---
config:
  theme: neutral
---
flowchart TD
    Start["Embedding Request"] --> T1

    subgraph T1Box["Tier 1: Embeddings API"]
        T1["OpenAI / llama.cpp<br/>text-embedding-3-small (1536d)<br/>POST /v1/embeddings"]
    end

    T1 -->|"fails?"| T2

    subgraph T2Box["Tier 2: LLM Emulation"]
        T2["Ask LLM for JSON array of floats<br/>64 dimensions<br/>Retries: 3 with backoff"]
    end

    T2 -->|"fails?"| T3

    subgraph T3Box["Tier 3: Deterministic Hash"]
        T3["hash -> LCG -> normalize<br/>Always works, no external deps<br/>Consistent across restarts"]
    end

    T3 --> Output["Embedding ready"]
    T1 -->|"succeeds"| Output
    T2 -->|"succeeds"| Output
```
**Tier 1: Direct Embeddings API (Default)**

The router first tries the standard embeddings endpoint:
- **OpenAI** — `text-embedding-3-small` (1536 dimensions) via `POST /v1/embeddings`
- **llama.cpp** — any local embedding model via the same endpoint format

Texts are processed in batches of up to 100 (configurable via `batchSize`) per API call, dramatically reducing round-trips.

**Tier 2: LLM Embedding Emulation**

When no embeddings-specific API is available but a chat LLM is, set `EMBEDDING_PROVIDER=emulation`. This asks **any LLM** (OpenAI, Anthropic, llama.cpp, vLLM, LiteLLM, ollama...) to generate embeddings through a carefully engineered text prompt:

```ascii
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

```ascii
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

### The HNSW Graph

HNSW (Hierarchical Navigable Small World) builds a multi-layer graph where the top layer has a few long-range connections (fast routing) and the bottom layer has many short-range connections (accurate neighbors). Search descends greedily through layers, then does a beam search (ef) on the bottom layer.

```mermaid
---
config:
  theme: neutral
---
flowchart LR
    subgraph Build["HNSW Building"]
        direction TB
        B1["Insert one-by-one"]
        B2["Assign layer via<br/>exponential decay"]
        B3["Connect to M nearest"]
        B4["Shrink excess edges"]
    end

    subgraph Search["HNSW Searching"]
        direction TB
        S1["Enter at top layer"]
        S2["Greedy descent"]
        S3["Beam search ef"]
        S4["Return top k"]
    end

    Build -->|"graph ready"| Search
    Note["Key insight: HNSW achieves ~1ms search<br/>with 96%+ recall at 1536d<br/>18x faster than brute-force"]
```
### Performance & Recall

| Metric | Brute Force | HNSW (ef=50) | HNSW (ef=200) |
|---|---|---|---|
| Search time (10K × 1536d) | 20.2ms | 1.1ms | 2.8ms |
| Recall @ 20 | 100% | 96.0% | 99%+ |
| Build time (10K) | N/A | 29s | ~120s |

HNSW returns the top 20 candidates with ~1ms latency, which are then re-ranked by the LLM. The ef parameter trades search speed for recall — ef=50 is the default for production, ef=200 for maximum accuracy.

---

## LLM Ranking: The Final Arbiter

Vector search finds semantically similar skills, but it can miss nuance. That's where the LLM Ranker comes in.

### The Ranking Prompt

The LLM receives a structured prompt:

```ascii
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

```ascii
scan response character by character
track brace depth { } and string state "..."
find matching closing brace for the outermost object
extract complete JSON even with thinking text prepended
```

This means you can route through Qwen3 or Claude 3.5 Sonnet and the router correctly strips the reasoning tokens, extracting only the JSON ranking response. If JSON extraction fails entirely, it falls back to line-by-line regex parsing of the raw text.

### Caching

Ranking results are cached by a deterministic hash of the task + candidate set. This prevents redundant LLM calls when the same task (or a very similar one) arrives again. Cache hit response: microseconds instead of ~3 seconds.

---

## Skill Loading: Where Skills Come From

The router has a two-tier skill loading system designed for scale.

```mermaid
---
config:
  theme: neutral
---
flowchart TD
    subgraph Loading["Skill Loading Pipeline"]
        direction TB
        L1["1. Remote Index<br/>Fetches skills-index.json<br/>from GitHub (lightweight)"]
        L2["2. On-Demand Content Fetch<br/>Memory cache -> Disk cache -><br/>GitHub raw URL"]
        L3["3. Fallback: Git Clone<br/>If index fails"]
        L4["4. Embedding Generation<br/>Batched, 200/call"]
        L5["5. HNSW Build<br/>~1ms search, ready"]
        L1 --> L2 --> L3 --> L4 --> L5
    end
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

Once skills are loaded, the router generates embeddings in batches of 200. The HNSW graph is rebuilt from scratch after any reload to ensure the search index is always consistent.

---

## MCP Integration: How OpenCode Talks to the Router

The MCP (Model Context Protocol) bridge is the glue that connects OpenCode to the Skill Router. It's a stdio-based Node.js process (`skill-router-mcp.js`) that exposes two tools to the AI agent.

```mermaid
---
config:
  theme: neutral
---
flowchart LR
    subgraph MCP["MCP Integration Flow"]
        direction LR
        OC["OpenCode<br/>Agent"] <-->|"Stdio<br/>JSON-RPC 2.0"| Bridge["skill-router-mcp.js<br/>tools/list<br/>tools/call"]
        Bridge <-->|"HTTP :3000"| Router["Skill Router<br/>Fastify<br/>POST /route<br/>GET /skill/:name"]
        OC --> Inject["Skill content injected<br/>into agent context<br/># Skill: coding-security-review<br/>..."]
    end
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

```mermaid
---
config:
  theme: neutral
---
flowchart TD
    subgraph Cache["Compression Cache Layers"]
        direction TB
        L1["In-Memory (LRU)<br/>84% hit rate, 1GB max<br/>1hr TTL (cold) / 30min (hot)"]
        L1 -->|"miss"| L2["Disk Cache<br/>7-day TTL<br/>Lazy-write every 5s"]
        L2 -->|"miss"| L3["Original Content<br/>From GitHub / disk"]
    end
    Note["Adaptive TTL: hot skills (top 100) get 30min TTL,<br/>cold skills get 1hr. Hot skills protected from eviction."]
```
---

## Link Following: Skills That Reference the Web

Skill documents can contain markdown links — both to local files (`[details](implementation.md)`) and to external URLs (`[docs](https://example.com)`). When enabled, the **MarkdownLinkResolver** automatically resolves these links and inlines the referenced content directly into the skill.

```mermaid
---
config:
  theme: neutral
---
flowchart TD
    Input["Skill content with links<br/>See [details](deep-dive.md)<br/>Read [docs](example.com)"] --> Parse["Parse markdown links via regex"]
    Parse --> Local["Local file reference<br/>Read file safely<br/>Path traversal protection"]
    Parse --> External["External URL"]
    External --> E1["Static HTTP<br/>5s timeout, 1MB limit"]
    External --> E2["Puppeteer + Chromium<br/>JS rendering if enabled"]
    Local --> Process["Content Processing"]
    E1 --> Process
    E2 --> Process
    Process --> P1["1. Under threshold -> inline full"]
    Process --> P2["2. Over threshold -> compress"]
    Process --> P3["3. Semantic mode -> chunk -> embed -> top-K"]
    P1 --> Output["Inline as formatted reference section<br/>[*] Reference: ..."]
    P2 --> Output
    P3 --> Output
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

---

### ◈ TIER 3: REFERENCE

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

```mermaid
---
config:
  theme: neutral
---
flowchart TD
    subgraph Docker["Docker Container"]
        direction TB
        App["skill-router<br/>Port 3000"] --> Sources
        Sources --> GitHub["GitHub raw (remote)<br/>Primary: lightweight index"]
        Sources --> LocalDisk["Local disk (mounted)<br/>Fallback: git clone"]
        App --> Caches["Caches<br/>/cache (persisted compressions)<br/>/app/cache/compressed"]
        App --> SSH["SSH agent forwarding<br/>for private repos"]
    end
    Docker -->|"HTTP :3000"| API["HTTP API"]
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

> **Learn more:** [AGENTS.md](./AGENTS.md) — complete guide to creating skills
>
> **Quick start:** `./install-skill-router.sh` — interactive installation
>
> **Stat:** 758 skills, 8 domains, 84% cache hit rate, ~1.27s startup
