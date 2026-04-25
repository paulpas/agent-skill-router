# Agent Skill Router — 1,827 Expert Skills with Built-In Compression

**An AI skill routing system that automatically selects and injects the right expertise into your AI's context.** With 1,827 skills across 5 domains and built-in SkillCompressor for reducing token overhead, the router makes expert knowledge instantly available without manual commands.

```
You → "review this Python code for security issues"
      ↓
skill-router auto-fires → embeds task → vector search → LLM ranks → loads skills
      ↓
Full expert skills injected into context (compressed if needed) — AI answers as expert reviewer
```

**Key Features:**
- 🎯 **1,827 Skills** organized across Agent, CNCF, Coding, Programming, and Trading domains
- 🔄 **Auto-Routing** — tasks automatically match the most relevant skills
- 🗜️ **SkillCompressor** — reduce token overhead by 28-65% with configurable compression levels (0-10+)
- ⚡ **Fast** — cached warm requests respond in ~10ms; cold requests in ~3.5s
- 📦 **Self-Contained** — run locally or via Docker; no external API required for routing
- 🔌 **MCP Integration** — works with OpenCode's `route_to_skill` tool

---

## Quick Start

### Installation (OpenAI)

```bash
git clone https://github.com/paulpas/agent-skill-router
cd agent-skill-router
OPENAI_API_KEY=sk-... ./install-skill-router.sh --integrate-opencode
```

Restart OpenCode. Every task automatically routes to the most relevant skill.

### Local Model (no API key required)

```bash
./install-skill-router.sh \
  --provider llamacpp \
  --embedding-provider llamacpp \
  --llamacpp-url http://localhost:8080
```

> **Note:** llama.cpp must serve both `/v1/chat/completions` and `/v1/embeddings`.

---

## Directory Structure

All skills live in `skills/` organized by domain:

```
skills/
├── agent/                       (271 skills)
│   ├── confidence-based-selector/
│   │   └── SKILL.md
│   ├── task-decomposition-engine/
│   │   └── SKILL.md
│   └── ... 269 more
│
├── cncf/                        (365 skills)
│   ├── kubernetes/
│   │   └── SKILL.md
│   ├── prometheus/
│   │   └── SKILL.md
│   └── ... 363 more
│
├── coding/                      (317 skills)
│   ├── code-review/
│   │   └── SKILL.md
│   ├── test-driven-development/
│   │   └── SKILL.md
│   └── ... 315 more
│
├── programming/                 (791 skills)
│   ├── react-best-practices/
│   │   └── SKILL.md
│   ├── advanced-evaluation/
│   │   └── SKILL.md
│   └── ... 789 more
│
└── trading/                     (83 skills)
    ├── ai-anomaly-detection/
    │   └── SKILL.md
    ├── backtest-walk-forward/
    │   └── SKILL.md
    └── ... 81 more

agent-skill-routing-system/      ← HTTP routing service
scripts/                         ← maintenance automation
README.md, FAQ.md, AGENTS.md     ← documentation
```

Each skill is a single `SKILL.md` file with YAML frontmatter defining its purpose, triggers, and content.

---

## Compression Configuration

### What Is Compression?

SkillCompressor reduces the token overhead of skill content by removing unnecessary whitespace, comments, and formatting. This saves 28-65% of tokens while preserving all executable code and critical information.

| Level | Description | Token Savings | Use Case |
|-------|-------------|---------------|----------|
| **0** | No compression | 0% | Development, testing, debugging |
| **1** | Remove blank lines + trailing whitespace | ~12% | Default for streaming |
| **2** | Level 1 + collapse multiple spaces | ~18% | Balanced (recommended for most) |
| **3** | Level 2 + remove comments | ~24% | Production with code focus |
| **4** | Level 3 + minify JSON/YAML | ~28% | **Default in Docker** — sweet spot |
| **5** | Level 4 + strip metadata | ~35% | Aggressive compression |
| **6-8** | Progressive minification | 40-50% | Content-heavy skills only |
| **9-10+** | Maximum compression | 50-65% | Only for huge reference skills |

### Building with Compression

Build Docker images with a specific compression level:

```bash
# Build with level 4 (28% savings, recommended)
docker build --build-arg COMPRESSION_LEVEL=4 -t skill-router:latest .

# Build with level 2 (18% savings, more readable)
docker build --build-arg COMPRESSION_LEVEL=2 -t skill-router:latest .

# Build with maximum compression (65% savings)
docker build --build-arg COMPRESSION_LEVEL=10 -t skill-router:latest .
```

### Running with Compression

Set compression at runtime:

```bash
# Default (no compression)
node dist/index.js

# Level 2 (18% savings, recommended)
SKILL_COMPRESSION_LEVEL=2 node dist/index.js

# Level 4 (28% savings, Docker default)
SKILL_COMPRESSION_LEVEL=4 node dist/index.js

# Level 5 (35% savings, aggressive)
SKILL_COMPRESSION_LEVEL=5 node dist/index.js
```

### API Queries with Compression

Request compressed skill content via HTTP:

```bash
# Get uncompressed skill
curl http://localhost:3000/skill/coding-code-review

# Get skill with level 2 compression (18% savings)
curl "http://localhost:3000/skill/coding-code-review?compression=2"

# Get skill with level 4 compression (28% savings)
curl "http://localhost:3000/skill/coding-code-review?compression=4"

# Get skill with maximum compression (65% savings)
curl "http://localhost:3000/skill/coding-code-review?compression=10"
```

### Docker Compose Example

```yaml
version: '3.8'

services:
  skill-router:
    build:
      context: .
      args:
        COMPRESSION_LEVEL: 4    # 28% token savings
    environment:
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      SKILL_COMPRESSION_LEVEL: 4
    ports:
      - "3000:3000"
    volumes:
      - ./skills:/app/skills     # local skills mount
```

Run with:
```bash
docker-compose up -d
```

### Compression Metrics

Monitor compression savings:

```bash
curl http://localhost:3000/metrics
```

Example response:
```json
{
  "compression": {
    "level": 4,
    "avgTokenSavings": "28%",
    "skillsCompressed": 1777,
    "totalBytesOriginal": 52000000,
    "totalBytesCompressed": 37440000,
    "averageCompressionRatio": 0.72
  }
}
```

---

## How It Works

Every task triggers the `route_to_skill` MCP tool, which:

```mermaid
sequenceDiagram
    participant U as OpenCode User
    participant MCP as skill-router MCP
    participant API as Fastify :3000
    participant Embed as Embedding Service
    participant VDB as Vector Database
    participant LLM as LLM Ranker
    participant GH as GitHub Raw (or disk)

    U->>MCP: invoke route_to_skill(task)
    MCP->>API: POST /route {"task":"..."}
    API->>Embed: generate task embedding
    Embed-->>API: task vector
    API->>VDB: cosine similarity → top-20
    VDB-->>API: candidates with scores
    API->>LLM: rank candidates
    LLM-->>API: ranked skills with scores
    API-->>MCP: selected skills
    par fetch all skills
        MCP->>API: GET /skill/name-1
        MCP->>API: GET /skill/name-2
    end
    API->>GH: fetch SKILL.md (cached)
    GH-->>API: raw SKILL.md (optionally compressed)
    API-->>MCP: skill content(s)
    MCP-->>U: skills injected into context
    Note over U: Response ends with: > 📖 skill: name-1, name-2
```

### Latency

| Stage | Cold | Warm (cached) |
|-------|------|---------------|
| Task embedding | ~400 ms | ~1 ms |
| Vector search | ~1 ms | ~1 ms |
| LLM ranking | ~3,000 ms | ~5 ms |
| Skill fetch + compression | ~150 ms | ~1 ms |
| **Total** | **~3.5 s** | **~10 ms** |

---

## API Endpoints

### Health & Status

```bash
# Health check
curl http://localhost:3000/health
# Response: {"status":"healthy","version":"1.0.0"}

# Service statistics
curl http://localhost:3000/stats
# Response: {"skills":{"totalSkills":1777,"domains":[...]}}

# Compression metrics
curl http://localhost:3000/metrics
```

### Skills Management

```bash
# List all skills
curl http://localhost:3000/skills
# Response: [{name:"skill-1",domain:"agent",...}, ...]

# Get specific skill (uncompressed)
curl http://localhost:3000/skill/coding-code-review

# Get skill with compression
curl "http://localhost:3000/skill/coding-code-review?compression=4"

# Get skill with custom compression and JSON response
curl "http://localhost:3000/skill/coding-code-review?compression=2&format=json"
```

### Routing & Execution

```bash
# Route a task to skills
curl -X POST http://localhost:3000/route \
  -H "Content-Type: application/json" \
  -d '{
    "task": "review this Python code for security issues",
    "maxSkills": 3
  }'
# Response: {selected: [{name:"coding-code-review",score:0.95},...]}

# Execute a task (auto-route + fetch skills)
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "task": "help me deploy to Kubernetes",
    "compression": 2
  }'
```

### Access History

```bash
# Last 100 routing decisions
curl http://localhost:3000/access-log

# Response:
{
  "totalRequests": 150,
  "entries": [
    {
      "timestamp": "2026-04-25T14:30:00Z",
      "task": "review code",
      "topSkill": "coding-code-review",
      "confidence": 0.95,
      "latencyMs": 145
    }
  ]
}
```

### Force Sync (for new skills)

```bash
# Reload all skills from disk/GitHub
curl -X POST http://localhost:3000/reload
# Useful after pushing new skills
```

---

## Available Skills Directory

### Domain Breakdown

| Domain | Count | Focus |
|--------|-------|-------|
| **Agent** | 271 | AI orchestration, routing, task decomposition |
| **CNCF** | 365 | Kubernetes, cloud-native tooling, DevOps |
| **Coding** | 317 | Software patterns, security, testing |
| **Programming** | 791 | Algorithms, frameworks, languages |
| **Trading** | 83 | Execution, risk management, ML models |

### Agent Skills (271)

Orchestration, routing, and AI agent patterns for task automation.

| Skill | Description |
|-------|-------------|
| [confidence-based-selector](./skills/agent/confidence-based-selector/SKILL.md) | Select appropriate skill based on confidence scores and relevance |
| [task-decomposition-engine](./skills/agent/task-decomposition-engine/SKILL.md) | Break complex tasks into manageable subtasks |
| [parallel-skill-runner](./skills/agent/parallel-skill-runner/SKILL.md) | Execute multiple skills concurrently |
| [multi-skill-executor](./skills/agent/multi-skill-executor/SKILL.md) | Orchestrate skill execution with dependencies |
| [add-new-skill](./skills/agent/add-new-skill/SKILL.md) | Create and register new skills in the routing system |

*[View all 271 Agent skills →](./skills/agent/)*

### CNCF Skills (365)

Kubernetes, cloud-native projects, DevOps, and infrastructure patterns.

| Skill | Description |
|-------|-------------|
| [kubernetes](./skills/cncf/kubernetes/SKILL.md) | Container orchestration and cluster management |
| [prometheus](./skills/cncf/prometheus/SKILL.md) | Monitoring system and time series database |
| [helm](./skills/cncf/helm/SKILL.md) | Kubernetes package manager and templating |
| [istio](./skills/cncf/istio/SKILL.md) | Service mesh for traffic management |
| [etcd](./skills/cncf/etcd/SKILL.md) | Distributed key-value store for Kubernetes |

*[View all 365 CNCF skills →](./skills/cncf/)*

### Coding Skills (317)

Software engineering patterns, security, testing, and best practices.

| Skill | Description |
|-------|-------------|
| [code-review](./skills/coding/code-review/SKILL.md) | Security, bugs, code quality assessment |
| [test-driven-development](./skills/coding/test-driven-development/SKILL.md) | TDD workflows and test pyramid |
| [security-review](./skills/coding/security-review/SKILL.md) | Vulnerability scanning and secure coding |
| [fastapi-patterns](./skills/coding/fastapi-patterns/SKILL.md) | FastAPI structure and best practices |
| [pydantic-models](./skills/coding/pydantic-models/SKILL.md) | Data validation with Pydantic |

*[View all 317 Coding skills →](./skills/coding/)*

### Programming Skills (791)

Algorithms, data structures, frameworks, and language reference.

| Skill | Description |
|-------|-------------|
| [react-best-practices](./skills/programming/react-best-practices/SKILL.md) | Modern React patterns and hooks |
| [advanced-evaluation](./skills/programming/advanced-evaluation/SKILL.md) | Advanced evaluation techniques |
| [fp-react](./skills/programming/fp-react/SKILL.md) | Functional programming in React |
| [react-component-performance](./skills/programming/react-component-performance/SKILL.md) | React component optimization strategies |
| [react-flow-architect](./skills/programming/react-flow-architect/SKILL.md) | React Flow architecture and patterns |

*[View all 791 Programming skills →](./skills/programming/)*

### Trading Skills (83)

Algorithmic execution, risk management, backtesting, and ML models.

| Skill | Description |
|-------|-------------|
| [ai-anomaly-detection](./skills/trading/ai-anomaly-detection/SKILL.md) | AI-powered anomaly detection in market data |
| [backtest-walk-forward](./skills/trading/backtest-walk-forward/SKILL.md) | Robust strategy validation |
| [ai-explainable-ai](./skills/trading/ai-explainable-ai/SKILL.md) | Model interpretability in trading systems |
| [ai-feature-engineering](./skills/trading/ai-feature-engineering/SKILL.md) | Feature engineering for trading ML models |
| [ai-hyperparameter-tuning](./skills/trading/ai-hyperparameter-tuning/SKILL.md) | ML model hyperparameter optimization |

*[View all 83 Trading skills →](./skills/trading/)*

---

## Workflow: Adding New Skills

Create skills following this workflow:

### 1. Create Directory and SKILL.md

```bash
mkdir -p skills/<domain>/<skill-name>/
touch skills/<domain>/<skill-name>/SKILL.md
```

### 2. Write SKILL.md with Proper Format

```yaml
---
name: my-skill-name
description: What this skill does in one sentence
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  role: implementation
  scope: implementation
  output-format: code
  triggers: keyword1, keyword2, keyword3, how do i implement
---

# My Skill Title

Brief description of the skill's purpose and when to use it.

## When to Use

- Concrete use case 1
- Concrete use case 2

## When NOT to Use

- Anti-pattern or irrelevant context

## Core Workflow

1. **Step 1** — Description
2. **Step 2** — Description
3. **Step 3** — Description

## Implementation Patterns

```python
# Example code
```

## Related Skills

| Skill | Purpose |
|-------|---------|
| [related-skill](../../skills/domain/related-skill/SKILL.md) | Why you'd use this alongside |
```

### 3. Validate and Regenerate Index

```bash
# Validate YAML syntax
python3 scripts/reformat_skills.py

# Update router index
python3 generate_index.py

# Regenerate README catalog
python3 scripts/generate_readme.py
```

### 4. Commit and Push

```bash
git add -A
git commit -m "feat: add my-skill-name skill

- New skill directory: skills/<domain>/<skill-name>/
- Description: Brief description
- Triggers: keyword1, keyword2, keyword3"
git push origin main
```

The router auto-discovers new skills within `SKILL_SYNC_INTERVAL` seconds (default: 1 hour). For immediate pickup:

```bash
curl -X POST http://localhost:3000/reload
```

---

## Maintenance & Automation

This repository includes scripts to maintain skills and keep metadata consistent.

### generate_readme.py

Auto-generates the skills catalog in documentation:

```bash
python3 scripts/generate_readme.py
```

Updates README with all 1,777 skills organized by domain and role.

### enhance_triggers.py

Adds conversational triggers for better skill discovery:

```bash
python3 scripts/enhance_triggers.py
```

Suggests trigger improvements like:
- "how do I..." questions
- Common colloquialisms
- Related technology names
- Operational task language

### reformat_skills.py

Validates and normalizes YAML frontmatter:

```bash
python3 scripts/reformat_skills.py
```

Ensures all skills follow the format specification.

### generate_index.py

Regenerates `skills-index.json` for routing:

```bash
python3 generate_index.py
```

Must run after adding or modifying skills.

---

## Monitoring & Debugging

### Skill Access Logs

View routing decisions and skill usage:

```bash
# Last 100 routing accesses
curl http://localhost:3000/access-log

# Filter by skill name
curl "http://localhost:3000/access-log?skill=coding-code-review"
```

### Docker Logs

View service logs:

```bash
# Follow logs in real-time
docker logs -f skill-router

# Search for specific task routes
docker logs skill-router | grep "Route result"
```

### Performance Metrics

Check system performance:

```bash
curl http://localhost:3000/metrics
```

Returns:
- Compression statistics
- Embedding cache hits
- Vector search latency
- LLM ranking latency
- Skill access frequency

---

## FAQ

**Have questions?** Check the comprehensive [FAQ.md](./FAQ.md) with 27+ Q&A covering:
- How auto-routing works
- Skill management and creation
- Compression configuration
- Troubleshooting and optimization
- Offline mode and local models

---

## Related Documentation

- **[AGENTS.md](./AGENTS.md)** — Complete guide for creating new skills
- **[SKILL_FORMAT_SPEC.md](./SKILL_FORMAT_SPEC.md)** — Formal skill file specification
- **[COMPRESSION.md](./SKILL_COMPRESSION_IMPLEMENTATION.md)** — Detailed compression guide
- **[FAQ.md](./FAQ.md)** — Common questions and troubleshooting

---

## Docker Deployment

### Build Image

```bash
# Default (no compression)
docker build -t skill-router:latest .

# With compression level 4 (28% savings, recommended)
docker build --build-arg COMPRESSION_LEVEL=4 -t skill-router:latest .
```

### Run Container

```bash
# Basic
docker run -p 3000:3000 \
  -e OPENAI_API_KEY=$OPENAI_API_KEY \
  skill-router:latest

# With compression
docker run -p 3000:3000 \
  -e OPENAI_API_KEY=$OPENAI_API_KEY \
  -e SKILL_COMPRESSION_LEVEL=4 \
  skill-router:latest

# With local volume mount
docker run -p 3000:3000 \
  -v $(pwd)/skills:/app/skills \
  -e OPENAI_API_KEY=$OPENAI_API_KEY \
  -e SKILL_COMPRESSION_LEVEL=2 \
  skill-router:latest
```

### Docker Compose (Production)

```yaml
version: '3.8'

services:
  skill-router:
    build:
      context: .
      args:
        COMPRESSION_LEVEL: 4
    environment:
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      SKILL_COMPRESSION_LEVEL: 4
      SKILL_SYNC_INTERVAL: 3600
      NODE_ENV: production
    ports:
      - "3000:3000"
    volumes:
      - ./skills:/app/skills
      - skill-router-cache:/app/.cache
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  skill-router-cache:
```

Deploy:
```bash
docker-compose up -d
```

---

## Contributing

Skills are the core value of this system. To contribute:

1. Create a new skill following [AGENTS.md](./AGENTS.md)
2. Use specific, task-oriented triggers (not generic terms)
3. Include "When NOT to Use" section for complex skills
4. Run automation scripts before committing
5. Submit PR with descriptive commit message

---

## License

MIT — All skills are freely available and redistributable.

---

## Support

| Channel | Purpose |
|---------|---------|
| **GitHub Issues** | Bug reports, feature requests |
| **FAQ.md** | Common questions and troubleshooting |
| **AGENTS.md** | Skill creation guide and specifications |
| **OpenCode Integration** | Use `route_to_skill` in any task |

---

**Last updated:** 2026-04-25  
**Total skills:** 1,777  
**Domains:** Agent (222) · CNCF (365) · Coding (317) · Programming (790) · Trading (83)

<!-- AUTO-GENERATED SKILLS INDEX START -->

> **Last updated:** 2026-04-25 17:39:37 UTC  
> **Total skills:** 1778

## Skills by Domain


### Agent (222 skills)

| Skill Name | Description | Triggers |
|---|---|---|
| [a-development-branch](../../skills/agent/a-development-branch/SKILL.md) | "Provides use when implementation is complete, all tests... | finishing a development branch, workflow... |
| [actions-templates](../../skills/agent/actions-templates/SKILL.md) | "Provides Production-ready GitHub Actions workflow patterns... | github actions templates, workflow... |
| [actor-development](../../skills/agent/actor-development/SKILL.md) | 'Provides Important: Before you begin, fill in the... | apify actor development, automation... |
| [actorization](../../skills/agent/actorization/SKILL.md) | Provides Actorization converts existing software into... | apify actorization, automation... |
| [add-new-skill](../../skills/agent/add-new-skill/SKILL.md) | "'Step-by-step guide for adding a new skill to the... | add skill, contribute skill... |
| [advanced-workflows](../../skills/agent/advanced-workflows/SKILL.md) | "Provides Master advanced Git techniques to maintain clean... | git advanced workflows, workflow... |
| [advisor](../../skills/agent/advisor/SKILL.md) | "Provides Conselho de especialistas — consulta multiplos... | multi advisor, ai... |
| [agent-development](../../skills/agent/agent-development/SKILL.md) | "Provides AI agent development workflow for building... | ai agent development, granular... |
| [agent-memory](../../skills/agent/agent-memory/SKILL.md) | "Provides Scoped CLAUDE.md memory system that reduces... | hierarchical agent memory, memory... |
| [agent-patterns](../../skills/agent/agent-patterns/SKILL.md) | Implements this skill should be used when the user asks to... | multi agent patterns, ai... |
| [agent-task-orchestrator](../../skills/agent/agent-task-orchestrator/SKILL.md) | "Provides Route tasks to specialized AI agents with... | multi agent task orchestrator, agent... |
| [agents](../../skills/agent/agents/SKILL.md) | Provides Build background agents in sandboxed environments.... | hosted agents, ai... |
| [agents](../../skills/agent/agents/SKILL.md) | Provides Multi-agent orchestration patterns. Use when... | parallel agents, ai... |
| [agents-architect](../../skills/agent/agents-architect/SKILL.md) | Provides Expert in designing and building autonomous AI... | ai agents architect, ai... |
| [agents-dotnet](../../skills/agent/agents-dotnet/SKILL.md) | Provides Microsoft 365 Agents SDK for .NET. Build... | m365 agents dotnet, ai... |
| [agents-ts](../../skills/agent/agents-ts/SKILL.md) | Implements microsoft 365 agents sdk for typescript/node.js... | m365 agents ts, ai... |
| [agents-v2-py](../../skills/agent/agents-v2-py/SKILL.md) | Provides Build hosted agents using Azure AI Projects SDK... | hosted agents v2 py, ai... |
| [ai](../../skills/agent/ai/SKILL.md) | "Provides Build production-ready AI agents with PydanticAI... | pydantic ai, ai... |
| [ai-development](../../skills/agent/ai-development/SKILL.md) | "Provides Expert in building voice AI applications - from... | voice ai development, voice... |
| [analytics-automation](../../skills/agent/analytics-automation/SKILL.md) | 'Provides Automate Google Analytics tasks via Rube MCP... | google analytics automation, automation... |
| [and-validate](../../skills/agent/and-validate/SKILL.md) | 'Provides MANDATORY: Run appropriate validation tools after... | lint and validate, workflow... |
| [andruia-consultant](../../skills/agent/andruia-consultant/SKILL.md) | "Provides Arquitecto de Soluciones Principal y Consultor... | 00 andruia consultant, andruia... |
| [andruia-niche-intelligence](../../skills/agent/andruia-niche-intelligence/SKILL.md) | "Provides Estratega de Inteligencia de Dominio de Andru.ia.... | 20 andruia niche intelligence, andruia... |
| [andruia-skill-smith](../../skills/agent/andruia-skill-smith/SKILL.md) | "Provides Ingeniero de Sistemas de Andru.ia. Diseña,... | 10 andruia skill smith, andruia... |
| [api-integration](../../skills/agent/api-integration/SKILL.md) | Provides use when integrating google gemini api into... | gemini api integration, automation... |
| [audience-analysis](../../skills/agent/audience-analysis/SKILL.md) | Provides Understand audience demographics, preferences,... | apify audience analysis, automation... |
| [audio](../../skills/agent/audio/SKILL.md) | "Implements text-to-speech and speech-to-text using fal.ai... | fal audio, voice... |
| [audit](../../skills/agent/audit/SKILL.md) | Provides Comprehensive security auditing workflow covering... | security audit, workflow... |
| [auto-research](../../skills/agent/auto-research/SKILL.md) | "Provides Automatically fetch latest library/framework... | context7 auto research, meta... |
| [automation](../../skills/agent/automation/SKILL.md) | 'Provides Automate Airtable tasks via Rube MCP (Composio):... | airtable automation, automation... |
| [automation](../../skills/agent/automation/SKILL.md) | "Provides Automate Bitbucket repositories, pull requests,... | bitbucket automation, workflow... |
| [automation](../../skills/agent/automation/SKILL.md) | "Provides Automate changelog generation from commits, PRs,... | changelog automation, workflow... |
| [automation](../../skills/agent/automation/SKILL.md) | 'Provides Automate CircleCI tasks via Rube MCP (Composio):... | circleci automation, automation... |
| [automation](../../skills/agent/automation/SKILL.md) | Provides Automate ClickUp project management including... | clickup automation, automation... |
| [automation](../../skills/agent/automation/SKILL.md) | Provides Automate Freshdesk helpdesk operations including... | freshdesk automation, automation... |
| [automation](../../skills/agent/automation/SKILL.md) | "Provides Automate GitHub repositories, issues, pull... | github automation, workflow... |
| [automation](../../skills/agent/automation/SKILL.md) | "Provides Automate GitLab project management, issues, merge... | gitlab automation, workflow... |
| [automation](../../skills/agent/automation/SKILL.md) | 'Provides Automate HelpDesk tasks via Rube MCP (Composio):... | helpdesk automation, automation... |
| [automation](../../skills/agent/automation/SKILL.md) | Provides Automate HubSpot CRM operations (contacts,... | hubspot automation, automation... |
| [automation](../../skills/agent/automation/SKILL.md) | 'Provides Automate Intercom tasks via Rube MCP (Composio):... | intercom automation, automation... |
| [automation](../../skills/agent/automation/SKILL.md) | 'Provides Automate Make (Integromat) tasks via Rube MCP... | make automation, automation... |
| [automation](../../skills/agent/automation/SKILL.md) | 'Provides Automate Notion tasks via Rube MCP (Composio):... | notion automation, automation... |
| [automation](../../skills/agent/automation/SKILL.md) | 'Provides Automate Outlook tasks via Rube MCP (Composio):... | outlook automation, automation... |
| [automation](../../skills/agent/automation/SKILL.md) | 'Provides Automate Render tasks via Rube MCP (Composio):... | render automation, automation... |
| [automation](../../skills/agent/automation/SKILL.md) | Provides Automate SendGrid email delivery workflows... | sendgrid automation, automation... |
| [automation](../../skills/agent/automation/SKILL.md) | 'Provides Automate Shopify tasks via Rube MCP (Composio):... | shopify automation, automation... |
| [automation](../../skills/agent/automation/SKILL.md) | Provides Automate Slack workspace operations including... | slack automation, automation... |
| [automation](../../skills/agent/automation/SKILL.md) | 'Provides Automate Stripe tasks via Rube MCP (Composio):... | stripe automation, automation... |
| [automation](../../skills/agent/automation/SKILL.md) | Provides Workflow automation is the infrastructure that... | workflow automation, workflow... |
| [automation](../../skills/agent/automation/SKILL.md) | 'Provides Automate Zendesk tasks via Rube MCP (Composio):... | zendesk automation, automation... |
| [automation](../../skills/agent/automation/SKILL.md) | Provides Automate Zoom meeting creation, management,... | zoom automation, automation... |
| [automation-workflow-automate](../../skills/agent/automation-workflow-automate/SKILL.md) | Provides You are a workflow automation expert specializing... | cicd automation workflow automate, automation... |
| [autoscaling-advisor](../../skills/agent/autoscaling-advisor/SKILL.md) | "Advisors on optimal auto-scaling configurations for... | autoscaling advisor, autoscaling-advisor... |
| [before-completion](../../skills/agent/before-completion/SKILL.md) | "Provides Claiming work is complete without verification is... | verification before completion, workflow... |
| [behavioral-xray](../../skills/agent/behavioral-xray/SKILL.md) | "Provides X-ray any AI model's behavioral patterns —... | bdistill behavioral xray, ai... |
| [blueprint](../../skills/agent/blueprint/SKILL.md) | "Provides Turn a one-line objective into a step-by-step... | blueprint, planning... |
| [branch](../../skills/agent/branch/SKILL.md) | "Provides Create a git branch following Sentry naming... | create branch, workflow... |
| [brand-reputation-monitoring](../../skills/agent/brand-reputation-monitoring/SKILL.md) | Provides Scrape reviews, ratings, and brand mentions from... | apify brand reputation monitoring, automation... |
| [build](../../skills/agent/build/SKILL.md) | "Implements build for orchestration and agent coordination... | build, workflow... |
| [builder](../../skills/agent/builder/SKILL.md) | Provides Create MCP (Model Context Protocol) servers that... | mcp builder, ai... |
| [builder-ms](../../skills/agent/builder-ms/SKILL.md) | Provides use this skill when building mcp servers to... | mcp builder ms, ai... |
| [calendar-automation](../../skills/agent/calendar-automation/SKILL.md) | 'Provides Automate Outlook Calendar tasks via Rube MCP... | outlook calendar automation, automation... |
| [ci-cd-pipeline-analyzer](../../skills/agent/ci-cd-pipeline-analyzer/SKILL.md) | "Analyzes CI/CD pipelines for optimization opportunities,... | build bottlenecks, ci-cd analysis... |
| [ci-patterns](../../skills/agent/ci-patterns/SKILL.md) | "Provides Comprehensive GitLab CI/CD pipeline patterns for... | gitlab ci patterns, workflow... |
| [code-correctness-verifier](../../skills/agent/code-correctness-verifier/SKILL.md) | "Verifies code correctness by analyzing syntax, semantics,... | code correctness verifier, code-correctness-verifier... |
| [code-javascript](../../skills/agent/code-javascript/SKILL.md) | Provides Write JavaScript code in n8n Code nodes. Use when... | n8n code javascript, automation... |
| [code-python](../../skills/agent/code-python/SKILL.md) | Provides Write Python code in n8n Code nodes. Use when... | n8n code python, automation... |
| [code-review](../../skills/agent/code-review/SKILL.md) | "Provides Code review requires technical evaluation, not... | receiving code review, workflow... |
| [code-review](../../skills/agent/code-review/SKILL.md) | "Provides use when completing tasks, implementing major... | requesting code review, workflow... |
| [commit](../../skills/agent/commit/SKILL.md) | "Provides ALWAYS use this skill when committing code... | commit, workflow... |
| [competitor-intelligence](../../skills/agent/competitor-intelligence/SKILL.md) | Provides Analyze competitor strategies, content, pricing,... | apify competitor intelligence, automation... |
| [confidence-based-selector](../../skills/agent/confidence-based-selector/SKILL.md) | "Selects and executes the most appropriate skill based on... | appropriate, confidence based selector... |
| [container-inspector](../../skills/agent/container-inspector/SKILL.md) | "Inspects container configurations, runtime state, logs,... | container, container inspector... |
| [content-analytics](../../skills/agent/content-analytics/SKILL.md) | Provides Track engagement metrics, measure campaign ROI,... | apify content analytics, automation... |
| [context](../../skills/agent/context/SKILL.md) | "Provides use for file-based context management, dynamic... | filesystem context, meta... |
| [context-building](../../skills/agent/context-building/SKILL.md) | "Enables ultra-granular, line-by-line code analysis to... | audit context building, meta... |
| [core](../../skills/agent/core/SKILL.md) | 'Provides Auri: assistente de voz inteligente (Alexa +... | auri core, voice... |
| [creator](../../skills/agent/creator/SKILL.md) | "Provides To create new CLI skills following Anthropic's... | skill creator, meta... |
| [creator-ms](../../skills/agent/creator-ms/SKILL.md) | "Provides Guide for creating effective skills for AI coding... | skill creator ms, meta... |
| [dag-patterns](../../skills/agent/dag-patterns/SKILL.md) | Provides Build production Apache Airflow DAGs with best... | airflow dag patterns, workflow... |
| [database](../../skills/agent/database/SKILL.md) | Provides Database development and operations workflow... | database, workflow... |
| [dependency-graph-builder](../../skills/agent/dependency-graph-builder/SKILL.md) | "Builds and maintains dependency graphs for task execution,... | builds, dependency graph builder... |
| [deployment](../../skills/agent/deployment/SKILL.md) | Provides Kubernetes deployment workflow for container... | kubernetes deployment, granular... |
| [dev](../../skills/agent/dev/SKILL.md) | "Provides Trigger.dev expert for background jobs, AI... | trigger dev, workflow... |
| [dev-jobs-mcp](../../skills/agent/dev-jobs-mcp/SKILL.md) | "Provides Search 8,400+ AI and ML jobs across 489... | ai dev jobs mcp, mcp... |
| [developer](../../skills/agent/developer/SKILL.md) | "Provides Comprehensive guide for creating and managing... | skill developer, meta... |
| [development](../../skills/agent/development/SKILL.md) | "Provides Comprehensive web, mobile, and backend... | development, workflow... |
| [devops](../../skills/agent/devops/SKILL.md) | "Provides Cloud infrastructure and DevOps workflow covering... | cloud devops, workflow... |
| [diary](../../skills/agent/diary/SKILL.md) | 'Provides Unified Diary System: A context-preserving... | diary, meta... |
| [diff-quality-analyzer](../../skills/agent/diff-quality-analyzer/SKILL.md) | "Analyzes code quality changes in diffs by evaluating... | analyzes, code quality... |
| [docs-automation](../../skills/agent/docs-automation/SKILL.md) | Provides Lightweight Google Docs integration with... | google docs automation, automation... |
| [documentation](../../skills/agent/documentation/SKILL.md) | "Provides API documentation workflow for generating OpenAPI... | api documentation, granular... |
| [documentation](../../skills/agent/documentation/SKILL.md) | "Provides Documentation generation workflow covering API... | documentation, workflow... |
| [drive-automation](../../skills/agent/drive-automation/SKILL.md) | Provides Lightweight Google Drive integration with... | google drive automation, automation... |
| [driven-development](../../skills/agent/driven-development/SKILL.md) | "Provides use when executing implementation plans with... | subagent driven development, workflow... |
| [dynamic-replanner](../../skills/agent/dynamic-replanner/SKILL.md) | "Dynamically adjusts execution plans based on real-time... | adjusts, dynamic replanner... |
| [ecommerce](../../skills/agent/ecommerce/SKILL.md) | Provides Extract product data, prices, reviews, and seller... | apify ecommerce, automation... |
| [engineer](../../skills/agent/engineer/SKILL.md) | Transforms user prompts into optimized prompts using... | prompt engineer, automation... |
| [error-trace-explainer](../../skills/agent/error-trace-explainer/SKILL.md) | "Explains error traces and exceptions by analyzing stack... | error trace explainer, error-trace-explainer... |
| [evaluation](../../skills/agent/evaluation/SKILL.md) | "Provides Testing and benchmarking LLM agents including... | agent evaluation, ai... |
| [expression-syntax](../../skills/agent/expression-syntax/SKILL.md) | Provides Validate n8n expression syntax and fix common... | n8n expression syntax, automation... |
| [failure-mode-analysis](../../skills/agent/failure-mode-analysis/SKILL.md) | "Performs failure mode analysis by identifying potential... | analyzes, failure mode analysis... |
| [fastapi-development](../../skills/agent/fastapi-development/SKILL.md) | "Provides Python FastAPI backend development with async... | python fastapi development, granular... |
| [friday-agent](../../skills/agent/friday-agent/SKILL.md) | "Provides Build a low-latency, Iron Man-inspired tactical... | pipecat friday agent, voice... |
| [github-comments](../../skills/agent/github-comments/SKILL.md) | "Provides use when you need to address review or issue... | address github comments, workflow... |
| [goal-to-milestones](../../skills/agent/goal-to-milestones/SKILL.md) | "Translates high-level goals into actionable milestones and... | goal to milestones, goal-to-milestones... |
| [golang-pro](../../skills/agent/golang-pro/SKILL.md) | "Provides use when building durable distributed systems... | temporal golang pro, workflow... |
| [hooks-automation](../../skills/agent/hooks-automation/SKILL.md) | "Provides Master Git hooks setup with Husky, lint-staged,... | git hooks automation, workflow... |
| [hot-path-detector](../../skills/agent/hot-path-detector/SKILL.md) | "Identifies critical execution paths (hot paths) in code... | critical, execution... |
| [human-search-mcp](../../skills/agent/human-search-mcp/SKILL.md) | "Provides Search AI-ready websites, inspect indexed site... | not human search mcp, mcp... |
| [implement](../../skills/agent/implement/SKILL.md) | "Provides Execute tasks from a track's implementation plan... | conductor implement, workflow... |
| [implementation](../../skills/agent/implementation/SKILL.md) | Provides RAG (Retrieval-Augmented Generation)... | rag implementation, granular... |
| [improver](../../skills/agent/improver/SKILL.md) | "Provides Iteratively improve a Claude Code skill using the... | skill improver, meta... |
| [influencer-discovery](../../skills/agent/influencer-discovery/SKILL.md) | Provides Find and evaluate influencers for brand... | apify influencer discovery, automation... |
| [infra-drift-detector](../../skills/agent/infra-drift-detector/SKILL.md) | "Detects and reports infrastructure drift between desired... | cloud infrastructure, drift detection... |
| [infrastructure](../../skills/agent/infrastructure/SKILL.md) | Provides Terraform infrastructure as code workflow for... | terraform infrastructure, granular... |
| [inngest](../../skills/agent/inngest/SKILL.md) | "Provides Inngest expert for serverless-first background... | inngest, workflow... |
| [installer](../../skills/agent/installer/SKILL.md) | "Provides Instala, valida, registra e verifica novas skills... | skill installer, meta... |
| [intelligence](../../skills/agent/intelligence/SKILL.md) | "Provides Protocolo de Inteligência Pré-Tarefa — ativa... | task intelligence, workflow... |
| [issue-gate](../../skills/agent/issue-gate/SKILL.md) | "Provides use when starting a new implementation task and... | create issue gate, workflow... |
| [issues](../../skills/agent/issues/SKILL.md) | "Implements interact with github issues - create, list, and... | issues, workflow... |
| [k8s-debugger](../../skills/agent/k8s-debugger/SKILL.md) | "Diagnoses Kubernetes cluster issues, debug pods,... | container orchestration, diagnoses... |
| [lang](../../skills/agent/lang/SKILL.md) | Provides Native agent-to-agent language for compact... | lambda lang, ai... |
| [langgraph](../../skills/agent/langgraph/SKILL.md) | Provides Expert in LangGraph - the production-grade... | langgraph, ai... |
| [lead-generation](../../skills/agent/lead-generation/SKILL.md) | Implements scrape leads from multiple platforms using apify... | apify lead generation, automation... |
| [loop-delivery](../../skills/agent/loop-delivery/SKILL.md) | "Provides use when a coding task must be completed against... | closed loop delivery, workflow... |
| [make-patterns](../../skills/agent/make-patterns/SKILL.md) | Provides No-code automation democratizes workflow building.... | zapier make patterns, automation... |
| [manage](../../skills/agent/manage/SKILL.md) | 'Provides Manage track lifecycle: archive, restore, delete,... | conductor manage, workflow... |
| [management](../../skills/agent/management/SKILL.md) | "Provides use this skill when creating, managing, or... | track management, planning... |
| [manager-skill](../../skills/agent/manager-skill/SKILL.md) | Provides Manage multiple local CLI agents via tmux sessions... | agent manager skill, ai... |
| [market-research](../../skills/agent/market-research/SKILL.md) | Provides Analyze market conditions, geographic... | apify market research, automation... |
| [mcp-tools-expert](../../skills/agent/mcp-tools-expert/SKILL.md) | Provides Expert guide for using n8n-mcp MCP tools... | n8n mcp tools expert, automation... |
| [memory](../../skills/agent/memory/SKILL.md) | "Provides Persistent memory systems for LLM conversations... | conversation memory, memory... |
| [memory-systems](../../skills/agent/memory-systems/SKILL.md) | 'Provides Memory is the cornerstone of intelligent agents.... | agent memory systems, memory... |
| [memory-usage-analyzer](../../skills/agent/memory-usage-analyzer/SKILL.md) | "Analyzes memory allocation patterns, identifies memory... | analyzes, leaks... |
| [ml](../../skills/agent/ml/SKILL.md) | "Provides AI and machine learning workflow covering LLM... | ai ml, workflow... |
| [modes](../../skills/agent/modes/SKILL.md) | "Provides AI operational modes (brainstorm, implement,... | behavioral modes, meta... |
| [multi-skill-executor](../../skills/agent/multi-skill-executor/SKILL.md) | "Orchestrates execution of multiple skill specifications in... | execution, multi skill executor... |
| [network-diagnostics](../../skills/agent/network-diagnostics/SKILL.md) | "Diagnoses network connectivity issues, identifies... | bottlenecks, connectivity issues... |
| [new-track](../../skills/agent/new-track/SKILL.md) | "Provides Create a new track with specification and phased... | conductor new track, workflow... |
| [nextjs-development](../../skills/agent/nextjs-development/SKILL.md) | "Provides React and Next.js 14+ application development... | react nextjs development, granular... |
| [node-configuration](../../skills/agent/node-configuration/SKILL.md) | Provides Operation-aware node configuration guidance. Use... | n8n node configuration, automation... |
| [optimization](../../skills/agent/optimization/SKILL.md) | Provides PostgreSQL database optimization workflow for... | postgresql optimization, granular... |
| [optimizer](../../skills/agent/optimizer/SKILL.md) | Provides Diagnose and optimize Agent Skills (SKILL.md) with... | skill optimizer, meta... |
| [optimizer](../../skills/agent/optimizer/SKILL.md) | 'Provides Adaptive token optimizer: intelligent filtering,... | zipai optimizer, agent... |
| [orchestration-patterns](../../skills/agent/orchestration-patterns/SKILL.md) | "Provides Master workflow orchestration architecture with... | workflow orchestration patterns, workflow... |
| [orchestrator](../../skills/agent/orchestrator/SKILL.md) | "Provides use when a coding task should be driven... | acceptance orchestrator, workflow... |
| [parallel-agents](../../skills/agent/parallel-agents/SKILL.md) | Provides use when facing 2+ independent tasks that can be... | dispatching parallel agents, ai... |
| [parallel-skill-runner](../../skills/agent/parallel-skill-runner/SKILL.md) | "Executes multiple skill specifications concurrently,... | executes, multiple... |
| [patterns](../../skills/agent/patterns/SKILL.md) | "Provides use this skill when implementing tasks according... | workflow patterns, workflow... |
| [performance-profiler](../../skills/agent/performance-profiler/SKILL.md) | "Profiles code execution to identify performance... | bottlenecks, optimization... |
| [pipeline-workflow](../../skills/agent/pipeline-workflow/SKILL.md) | "Provides Complete end-to-end MLOps pipeline orchestration... | ml pipeline workflow, workflow... |
| [planning](../../skills/agent/planning/SKILL.md) | "Provides use when a user asks for a plan for a coding... | concise planning, planning... |
| [plans](../../skills/agent/plans/SKILL.md) | "Provides use when you have a written implementation plan... | executing plans, workflow... |
| [plans](../../skills/agent/plans/SKILL.md) | "Provides use when you have a spec or requirements for a... | writing plans, planning... |
| [plugin-development](../../skills/agent/plugin-development/SKILL.md) | "Provides WordPress plugin development workflow covering... | wordpress plugin development, granular... |
| [pr](../../skills/agent/pr/SKILL.md) | "Provides Alias for sentry-skills:pr-writer. Use when users... | create pr, workflow... |
| [pr](../../skills/agent/pr/SKILL.md) | "Provides Iterate on a PR until CI passes. Use when you... | iterate pr, workflow... |
| [pr-workflows-git-workflow](../../skills/agent/pr-workflows-git-workflow/SKILL.md) | "Provides Orchestrate a comprehensive git workflow from... | git pr workflows git workflow, workflow... |
| [pr-workflows-onboard](../../skills/agent/pr-workflows-onboard/SKILL.md) | "Provides You are an **expert onboarding specialist and... | git pr workflows onboard, workflow... |
| [pr-workflows-pr-enhance](../../skills/agent/pr-workflows-pr-enhance/SKILL.md) | "Provides You are a PR optimization expert specializing in... | git pr workflows pr enhance, workflow... |
| [project](../../skills/agent/project/SKILL.md) | "Provides Forensic root cause analyzer for Antigravity... | analyze project, meta... |
| [pushing](../../skills/agent/pushing/SKILL.md) | "Provides Stage all changes, create a conventional commit,... | git pushing, workflow... |
| [python-pro](../../skills/agent/python-pro/SKILL.md) | "Provides Master Temporal workflow orchestration with... | temporal python pro, workflow... |
| [qa](../../skills/agent/qa/SKILL.md) | Provides Comprehensive testing and QA workflow covering... | testing qa, workflow... |
| [qstash](../../skills/agent/qstash/SKILL.md) | "Provides Upstash QStash expert for serverless message... | upstash qstash, workflow... |
| [query-optimizer](../../skills/agent/query-optimizer/SKILL.md) | "Analyzes and optimizes database queries for performance,... | database optimization, query optimization... |
| [questions-if-underspecified](../../skills/agent/questions-if-underspecified/SKILL.md) | "Provides Clarify requirements before implementing. Use... | ask questions if underspecified, workflow... |
| [rails-upgrade](../../skills/agent/rails-upgrade/SKILL.md) | "Implements analyze rails apps and provide upgrade... | skill rails upgrade, meta... |
| [recallmax](../../skills/agent/recallmax/SKILL.md) | "Provides FREE — God-tier long-context memory for AI... | recallmax, memory... |
| [regression-detector](../../skills/agent/regression-detector/SKILL.md) | "Detects performance and behavioral regressions by... | behavioral, detects... |
| [resource-optimizer](../../skills/agent/resource-optimizer/SKILL.md) | "Optimizes resource allocation across distributed systems... | cost optimization, resource allocation... |
| [revert](../../skills/agent/revert/SKILL.md) | "Implements git-aware undo by logical work unit (track,... | conductor revert, workflow... |
| [review-requests](../../skills/agent/review-requests/SKILL.md) | "Provides Fetch unread GitHub notifications for open PRs... | gh review requests, workflow... |
| [router](../../skills/agent/router/SKILL.md) | "Provides use when the user is unsure which skill to use or... | skill router, meta... |
| [runtime-log-analyzer](../../skills/agent/runtime-log-analyzer/SKILL.md) | "Analyzes runtime logs from agent execution to identify... | analyzes, logs... |
| [scanner](../../skills/agent/scanner/SKILL.md) | "Provides Scan agent skills for security issues before... | skill scanner, meta... |
| [schema-inference-engine](../../skills/agent/schema-inference-engine/SKILL.md) | "Inferences data schemas from actual data samples,... | data schema, schema discovery... |
| [scripting](../../skills/agent/scripting/SKILL.md) | "Provides Bash scripting workflow for creating... | bash scripting, granular... |
| [scripting](../../skills/agent/scripting/SKILL.md) | "Provides Operating system and shell scripting... | os scripting, workflow... |
| [security-testing](../../skills/agent/security-testing/SKILL.md) | Provides API security testing workflow for REST and GraphQL... | api security testing, granular... |
| [security-testing](../../skills/agent/security-testing/SKILL.md) | Provides Web application security testing workflow for... | web security testing, granular... |
| [seekers](../../skills/agent/seekers/SKILL.md) | "Provides -Automatically convert documentation websites,... | skill seekers, meta... |
| [self-critique-engine](../../skills/agent/self-critique-engine/SKILL.md) | "Enables autonomous agents to self-critique their work by... | correctness, evaluates... |
| [sentinel](../../skills/agent/sentinel/SKILL.md) | "Provides Auditoria e evolucao do ecossistema de skills.... | skill sentinel, meta... |
| [setup](../../skills/agent/setup/SKILL.md) | "Provides Configure a Rails project to work with Conductor... | conductor setup, workflow... |
| [skill-backend-patterns](../../skills/agent/skill-backend-patterns/SKILL.md) | Provides Backend architecture patterns, API design,... | cc skill backend patterns, meta... |
| [skill-clickhouse-io](../../skills/agent/skill-clickhouse-io/SKILL.md) | Provides ClickHouse database patterns, query optimization,... | cc skill clickhouse io, meta... |
| [skill-coding-standards](../../skills/agent/skill-coding-standards/SKILL.md) | "Provides Universal coding standards, best practices, and... | cc skill coding standards, meta... |
| [skill-continuous-learning](../../skills/agent/skill-continuous-learning/SKILL.md) | "Implements development skill from everything-claude-code... | cc skill continuous learning, meta... |
| [skill-frontend-patterns](../../skills/agent/skill-frontend-patterns/SKILL.md) | "Provides Frontend development patterns for React, Next.js,... | cc skill frontend patterns, meta... |
| [skill-orchestrator](../../skills/agent/skill-orchestrator/SKILL.md) | "Provides a meta-skill that understands task requirements,... | antigravity skill orchestrator, meta... |
| [skill-project-guidelines-example](../../skills/agent/skill-project-guidelines-example/SKILL.md) | "Implements project guidelines skill (example) for... | cc skill project guidelines example, meta... |
| [skill-security-review](../../skills/agent/skill-security-review/SKILL.md) | Provides this skill ensures all code follows security best... | cc skill security review, meta... |
| [skill-strategic-compact](../../skills/agent/skill-strategic-compact/SKILL.md) | "Implements development skill from everything-claude-code... | cc skill strategic compact, meta... |
| [skills](../../skills/agent/skills/SKILL.md) | "Implements use when creating, updating, or improving agent... | writing skills, meta... |
| [stack-orchestration-full-stack-feature](../../skills/agent/stack-orchestration-full-stack-feature/SKILL.md) | "Provides use when working with full stack orchestration... | full stack orchestration full stack feature, workflow... |
| [stacktrace-root-cause](../../skills/agent/stacktrace-root-cause/SKILL.md) | "Performs stacktrace root cause analysis by examining stack... | analyzes, failures... |
| [status](../../skills/agent/status/SKILL.md) | "Implements display project status, active tracks, and next... | conductor status, workflow... |
| [superpowers](../../skills/agent/superpowers/SKILL.md) | "Provides use when starting any conversation - establishes... | using superpowers, meta... |
| [systems](../../skills/agent/systems/SKILL.md) | "Provides Design short-term, long-term, and graph-based... | memory systems, memory... |
| [task-decomposition-engine](../../skills/agent/task-decomposition-engine/SKILL.md) | "Decomposes complex tasks into smaller, manageable subtasks... | complex, decomposes... |
| [test-oracle-generator](../../skills/agent/test-oracle-generator/SKILL.md) | "Generates test oracles and expected outputs for testing... | expected output, test oracle... |
| [testing](../../skills/agent/testing/SKILL.md) | Provides End-to-end testing workflow with Playwright for... | e2e testing, granular... |
| [theme-development](../../skills/agent/theme-development/SKILL.md) | "Provides WordPress theme development workflow covering... | wordpress theme development, granular... |
| [transcriber](../../skills/agent/transcriber/SKILL.md) | "Provides Transform audio recordings into professional... | audio transcriber, voice... |
| [trend-analysis](../../skills/agent/trend-analysis/SKILL.md) | Provides Discover and track emerging trends across Google... | apify trend analysis, automation... |
| [troubleshooting](../../skills/agent/troubleshooting/SKILL.md) | "Provides Linux system troubleshooting workflow for... | linux troubleshooting, granular... |
| [ultimate-scraper](../../skills/agent/ultimate-scraper/SKILL.md) | Provides AI-driven data extraction from 55+ Actors across... | apify ultimate scraper, automation... |
| [validation-expert](../../skills/agent/validation-expert/SKILL.md) | Provides Expert guide for interpreting and fixing n8n... | n8n validation expert, automation... |
| [validator](../../skills/agent/validator/SKILL.md) | "Validates Conductor project artifacts for completeness"... | conductor validator, workflow... |
| [viboscope](../../skills/agent/viboscope/SKILL.md) | "Provides Psychological compatibility matching — find... | viboscope, collaboration... |
| [window-management](../../skills/agent/window-management/SKILL.md) | "Provides Strategies for managing LLM context windows... | context window management, memory... |
| [with-files](../../skills/agent/with-files/SKILL.md) | 'Implements work like manus: use persistent markdown files... | planning with files, planning... |
| [woocommerce-development](../../skills/agent/woocommerce-development/SKILL.md) | 'Provides WooCommerce store development workflow covering... | wordpress woocommerce development, granular... |
| [wordpress](../../skills/agent/wordpress/SKILL.md) | "Provides Complete WordPress development workflow covering... | wordpress, workflow... |
| [workflow-automation](../../skills/agent/workflow-automation/SKILL.md) | "Provides Patterns for automating GitHub workflows with AI... | github workflow automation, workflow... |
| [workflow-patterns](../../skills/agent/workflow-patterns/SKILL.md) | Implements proven architectural patterns for building n8n... | n8n workflow patterns, automation... |
| [workflows](../../skills/agent/workflows/SKILL.md) | "Provides Orchestrate multiple Antigravity skills through... | antigravity workflows, workflow... |
| [writer](../../skills/agent/writer/SKILL.md) | "Provides Create pull requests following Sentry's... | pr writer, workflow... |
| [writer](../../skills/agent/writer/SKILL.md) | "Provides Create and improve agent skills following the... | skill writer, meta... |
| [writing](../../skills/agent/writing/SKILL.md) | "Provides Structured task planning with clear breakdowns,... | plan writing, planning... |


### Cncf (365 skills)

| Skill Name | Description | Triggers |
|---|---|---|
| [admin](../../skills/cncf/admin/SKILL.md) | "Provides Expert database administrator specializing in... | database admin, database... |
| [ai](../../skills/cncf/ai/SKILL.md) | "Provides Autonomous DevSecOps & FinOps Guardrails.... | aegisops ai, devops... |
| [ai-agents-persistent-dotnet](../../skills/cncf/ai-agents-persistent-dotnet/SKILL.md) | "Provides Azure AI Agents Persistent SDK for .NET.... | azure ai agents persistent dotnet, cloud... |
| [ai-agents-persistent-java](../../skills/cncf/ai-agents-persistent-java/SKILL.md) | "Provides Azure AI Agents Persistent SDK for Java.... | azure ai agents persistent java, cloud... |
| [ai-anomalydetector-java](../../skills/cncf/ai-anomalydetector-java/SKILL.md) | "Provides Build anomaly detection applications with Azure... | azure ai anomalydetector java, cloud... |
| [ai-contentsafety-java](../../skills/cncf/ai-contentsafety-java/SKILL.md) | "Provides Build content moderation applications using the... | azure ai contentsafety java, cloud... |
| [ai-contentsafety-py](../../skills/cncf/ai-contentsafety-py/SKILL.md) | "Provides Azure AI Content Safety SDK for Python. Use for... | azure ai contentsafety py, cloud... |
| [ai-contentsafety-ts](../../skills/cncf/ai-contentsafety-ts/SKILL.md) | "Provides Analyze text and images for harmful content with... | azure ai contentsafety ts, cloud... |
| [ai-contentunderstanding-py](../../skills/cncf/ai-contentunderstanding-py/SKILL.md) | "Provides Azure AI Content Understanding SDK for Python.... | azure ai contentunderstanding py, cloud... |
| [ai-document-intelligence-dotnet](../../skills/cncf/ai-document-intelligence-dotnet/SKILL.md) | Provides Azure AI Document Intelligence SDK for .NET.... | azure ai document intelligence dotnet, cloud... |
| [ai-document-intelligence-ts](../../skills/cncf/ai-document-intelligence-ts/SKILL.md) | Provides Extract text, tables, and structured data from... | azure ai document intelligence ts, cloud... |
| [ai-formrecognizer-java](../../skills/cncf/ai-formrecognizer-java/SKILL.md) | "Provides Build document analysis applications using the... | azure ai formrecognizer java, cloud... |
| [ai-ml-py](../../skills/cncf/ai-ml-py/SKILL.md) | Provides Azure Machine Learning SDK v2 for Python. Use for... | azure ai ml py, cloud... |
| [ai-openai-dotnet](../../skills/cncf/ai-openai-dotnet/SKILL.md) | "Provides Azure OpenAI SDK for .NET. Client library for... | azure ai openai dotnet, cloud... |
| [ai-projects-dotnet](../../skills/cncf/ai-projects-dotnet/SKILL.md) | "Provides Azure AI Projects SDK for .NET. High-level client... | azure ai projects dotnet, cloud... |
| [ai-projects-java](../../skills/cncf/ai-projects-java/SKILL.md) | Provides Azure AI Projects SDK for Java. High-level SDK for... | azure ai projects java, cloud... |
| [ai-projects-py](../../skills/cncf/ai-projects-py/SKILL.md) | "Provides Build AI applications on Microsoft Foundry using... | azure ai projects py, cloud... |
| [ai-projects-ts](../../skills/cncf/ai-projects-ts/SKILL.md) | "Provides High-level SDK for Azure AI Foundry projects with... | azure ai projects ts, cloud... |
| [ai-textanalytics-py](../../skills/cncf/ai-textanalytics-py/SKILL.md) | "Provides Azure AI Text Analytics SDK for sentiment... | azure ai textanalytics py, cloud... |
| [ai-transcription-py](../../skills/cncf/ai-transcription-py/SKILL.md) | "Provides Azure AI Transcription SDK for Python. Use for... | azure ai transcription py, cloud... |
| [ai-translation-document-py](../../skills/cncf/ai-translation-document-py/SKILL.md) | "Provides Azure AI Document Translation SDK for batch... | azure ai translation document py, cloud... |
| [ai-translation-text-py](../../skills/cncf/ai-translation-text-py/SKILL.md) | "Provides Azure AI Text Translation SDK for real-time text... | azure ai translation text py, cloud... |
| [ai-translation-ts](../../skills/cncf/ai-translation-ts/SKILL.md) | "Configures text and document translation with rest-style... | azure ai translation ts, cloud... |
| [ai-vision-imageanalysis-java](../../skills/cncf/ai-vision-imageanalysis-java/SKILL.md) | "Provides Build image analysis applications with Azure AI... | azure ai vision imageanalysis java, cloud... |
| [ai-vision-imageanalysis-py](../../skills/cncf/ai-vision-imageanalysis-py/SKILL.md) | "Provides Azure AI Vision Image Analysis SDK for captions,... | azure ai vision imageanalysis py, cloud... |
| [ai-voicelive-dotnet](../../skills/cncf/ai-voicelive-dotnet/SKILL.md) | "Provides Azure AI Voice Live SDK for .NET. Build real-time... | azure ai voicelive dotnet, cloud... |
| [ai-voicelive-java](../../skills/cncf/ai-voicelive-java/SKILL.md) | "Provides Azure AI VoiceLive SDK for Java. Real-time... | azure ai voicelive java, cloud... |
| [ai-voicelive-py](../../skills/cncf/ai-voicelive-py/SKILL.md) | "Provides Build real-time voice AI applications with... | azure ai voicelive py, cloud... |
| [ai-voicelive-ts](../../skills/cncf/ai-voicelive-ts/SKILL.md) | "Provides Azure AI Voice Live SDK for... | azure ai voicelive ts, cloud... |
| [alexa](../../skills/cncf/alexa/SKILL.md) | "Provides Integracao completa com Amazon Alexa para criar... | amazon alexa, cloud... |
| [appconfiguration-java](../../skills/cncf/appconfiguration-java/SKILL.md) | "Provides Azure App Configuration SDK for Java. Centralized... | azure appconfiguration java, cloud... |
| [appconfiguration-py](../../skills/cncf/appconfiguration-py/SKILL.md) | "Provides Azure App Configuration SDK for Python. Use for... | azure appconfiguration py, cloud... |
| [appconfiguration-ts](../../skills/cncf/appconfiguration-ts/SKILL.md) | "Provides Centralized configuration management with feature... | azure appconfiguration ts, cloud... |
| [apps](../../skills/cncf/apps/SKILL.md) | "Provides Expert patterns for Shopify app development... | shopify apps, api... |
| [architect](../../skills/cncf/architect/SKILL.md) | "Provides Expert cloud architect specializing in... | cloud architect, cloud... |
| [architect](../../skills/cncf/architect/SKILL.md) | Provides Expert database architect specializing in data... | database architect, database... |
| [architect](../../skills/cncf/architect/SKILL.md) | Provides Expert Kubernetes architect specializing in... | kubernetes architect, devops... |
| [architecture-best-practices](../../skills/cncf/architecture-best-practices/SKILL.md) | "Cloud Native Computing Foundation (CNCF) architecture best... | architecture best practices, architecture-best-practices... |
| [argo](../../skills/cncf/argo/SKILL.md) | "Argo in Cloud-Native Engineering - Kubernetes-Native... | argo, cloud-native... |
| [artifact-hub](../../skills/cncf/artifact-hub/SKILL.md) | "Provides Artifact Hub in Cloud-Native Engineering -... | artifact hub, artifact-hub... |
| [automation](../../skills/cncf/automation/SKILL.md) | 'Provides Automate Datadog tasks via Rube MCP (Composio):... | datadog automation, reliability... |
| [automation](../../skills/cncf/automation/SKILL.md) | 'Provides Automate Discord tasks via Rube MCP (Composio):... | discord automation, api... |
| [automation](../../skills/cncf/automation/SKILL.md) | 'Provides Automate PagerDuty tasks via Rube MCP (Composio):... | pagerduty automation, reliability... |
| [automation](../../skills/cncf/automation/SKILL.md) | 'Provides Automate Postmark email delivery tasks via Rube... | postmark automation, api... |
| [automation](../../skills/cncf/automation/SKILL.md) | 'Provides Automate Salesforce tasks via Rube MCP... | salesforce automation, api... |
| [automation](../../skills/cncf/automation/SKILL.md) | 'Provides Automate Sentry tasks via Rube MCP (Composio):... | sentry automation, reliability... |
| [automation](../../skills/cncf/automation/SKILL.md) | 'Provides Automate Square tasks via Rube MCP (Composio):... | square automation, api... |
| [automation](../../skills/cncf/automation/SKILL.md) | 'Provides Automate Telegram tasks via Rube MCP (Composio):... | telegram automation, api... |
| [automation](../../skills/cncf/automation/SKILL.md) | 'Provides Automate WhatsApp Business tasks via Rube MCP... | whatsapp automation, api... |
| [aws-auto-scaling](../../skills/cncf/aws-auto-scaling/SKILL.md) | "Configures automatic scaling of compute resources (EC2,... | asg, auto-scaling... |
| [aws-cloudformation](../../skills/cncf/aws-cloudformation/SKILL.md) | "Creates Infrastructure as Code templates with... | cloudformation, infrastructure as code... |
| [aws-cloudfront](../../skills/cncf/aws-cloudfront/SKILL.md) | "Configures CloudFront CDN for global content distribution... | cloudfront, cdn... |
| [aws-cloudwatch](../../skills/cncf/aws-cloudwatch/SKILL.md) | "Configures CloudWatch monitoring with metrics, logs,... | cloudwatch, monitoring... |
| [aws-dynamodb](../../skills/cncf/aws-dynamodb/SKILL.md) | "Deploys managed NoSQL databases with DynamoDB for... | dynamodb, nosql... |
| [aws-ec2](../../skills/cncf/aws-ec2/SKILL.md) | "Deploys, configures, and auto-scales EC2 instances with... | ec2, compute instances... |
| [aws-ecr](../../skills/cncf/aws-ecr/SKILL.md) | "Manages container image repositories with ECR for secure... | container registry, container security... |
| [aws-eks](../../skills/cncf/aws-eks/SKILL.md) | "Deploys managed Kubernetes clusters with EKS for container... | eks, container orchestration... |
| [aws-elb](../../skills/cncf/aws-elb/SKILL.md) | "Configures Elastic Load Balancing (ALB, NLB, Classic) for... | elb, load balancer... |
| [aws-iam](../../skills/cncf/aws-iam/SKILL.md) | "Configures identity and access management with IAM users,... | iam, identity management... |
| [aws-kms](../../skills/cncf/aws-kms/SKILL.md) | "Manages encryption keys with AWS KMS for data protection... | cmk, customer-managed key... |
| [aws-lambda](../../skills/cncf/aws-lambda/SKILL.md) | "Deploys serverless event-driven applications with Lambda... | lambda, serverless... |
| [aws-modules](../../skills/cncf/aws-modules/SKILL.md) | "Provides Terraform module creation for AWS — reusable... | terraform aws modules, devops... |
| [aws-rds](../../skills/cncf/aws-rds/SKILL.md) | "Deploys managed relational databases (MySQL, PostgreSQL,... | rds, relational database... |
| [aws-route53](../../skills/cncf/aws-route53/SKILL.md) | "Configures DNS routing with Route 53 for domain... | cname, dns... |
| [aws-s3](../../skills/cncf/aws-s3/SKILL.md) | "Configures S3 object storage with versioning, lifecycle... | s3, object storage... |
| [aws-secrets-manager](../../skills/cncf/aws-secrets-manager/SKILL.md) | "Manages sensitive data with automatic encryption,... | credential rotation, password rotation... |
| [aws-sns](../../skills/cncf/aws-sns/SKILL.md) | "Deploys managed pub/sub messaging with SNS for... | messaging, notifications... |
| [aws-sqs](../../skills/cncf/aws-sqs/SKILL.md) | "Deploys managed message queues with SQS for asynchronous... | dead-letter queue, fifo queue... |
| [aws-ssm](../../skills/cncf/aws-ssm/SKILL.md) | "Manages EC2 instances and on-premises servers with AWS... | configuration management, parameter store... |
| [aws-vpc](../../skills/cncf/aws-vpc/SKILL.md) | "Configures Virtual Private Clouds with subnets, route... | vpc, virtual private cloud... |
| [azure-aks](../../skills/cncf/azure-aks/SKILL.md) | "Provides Managed Kubernetes cluster with automatic scaling... | aks, kubernetes... |
| [azure-automation](../../skills/cncf/azure-automation/SKILL.md) | Provides Automation and orchestration of Azure resources... | automation, runbooks... |
| [azure-blob-storage](../../skills/cncf/azure-blob-storage/SKILL.md) | Provides Object storage with versioning, lifecycle... | blob storage, object storage... |
| [azure-cdn](../../skills/cncf/azure-cdn/SKILL.md) | Provides Content delivery network for caching and global... | cdn, content delivery... |
| [azure-container-registry](../../skills/cncf/azure-container-registry/SKILL.md) | "Provides Stores and manages container images with... | container registry, acr... |
| [azure-cosmos-db](../../skills/cncf/azure-cosmos-db/SKILL.md) | Provides Global NoSQL database with multi-region... | cosmos db, nosql... |
| [azure-event-hubs](../../skills/cncf/azure-event-hubs/SKILL.md) | "Provides Event streaming platform for high-throughput data... | event hubs, event streaming... |
| [azure-functions](../../skills/cncf/azure-functions/SKILL.md) | Provides Serverless computing with event-driven functions... | azure functions, serverless... |
| [azure-key-vault](../../skills/cncf/azure-key-vault/SKILL.md) | "Manages encryption keys, secrets, and certificates with... | key vault, key management... |
| [azure-keyvault-secrets](../../skills/cncf/azure-keyvault-secrets/SKILL.md) | "Provides Secret management and rotation for sensitive... | secrets, secret management... |
| [azure-load-balancer](../../skills/cncf/azure-load-balancer/SKILL.md) | Provides Distributes traffic across VMs with health probes... | load balancer, load balancing... |
| [azure-monitor](../../skills/cncf/azure-monitor/SKILL.md) | "Provides Monitoring and logging for Azure resources with... | azure monitor, monitoring... |
| [azure-rbac](../../skills/cncf/azure-rbac/SKILL.md) | "Manages identity and access with roles, service... | rbac, role-based access... |
| [azure-resource-manager](../../skills/cncf/azure-resource-manager/SKILL.md) | "Provides Infrastructure as code using ARM templates for... | resource manager, arm templates... |
| [azure-scale-sets](../../skills/cncf/azure-scale-sets/SKILL.md) | "Manages auto-scaling VM groups with load balancing and... | scale sets, vmss... |
| [azure-service-bus](../../skills/cncf/azure-service-bus/SKILL.md) | "Provides Messaging service with queues and topics for... | service bus, messaging... |
| [azure-sql-database](../../skills/cncf/azure-sql-database/SKILL.md) | Provides Managed relational database with elastic pools,... | sql database, relational database... |
| [azure-traffic-manager](../../skills/cncf/azure-traffic-manager/SKILL.md) | Provides DNS-based traffic routing with health checks and... | traffic manager, dns... |
| [azure-virtual-machines](../../skills/cncf/azure-virtual-machines/SKILL.md) | "Deploys and manages VMs with auto-scaling, availability... | virtual machines, vm... |
| [azure-virtual-networks](../../skills/cncf/azure-virtual-networks/SKILL.md) | "Provides Networking with subnets, network security groups,... | virtual networks, networking... |
| [azure-webjobs-extensions-authentication-events-dotnet](../../skills/cncf/azure-webjobs-extensions-authentication-events-dotnet/SKILL.md) | "Provides Microsoft Entra Authentication Events SDK for... | microsoft azure webjobs extensions authentication events dotnet, cloud... |
| [backstage](../../skills/cncf/backstage/SKILL.md) | "Provides Backstage in Cloud-Native Engineering - Developer... | backstage, cloud-native... |
| [base](../../skills/cncf/base/SKILL.md) | Provides Database management, forms, reports, and data... | base, database... |
| [best-practices](../../skills/cncf/best-practices/SKILL.md) | Provides CloudFormation template optimization, nested... | cloudformation best practices, cloud... |
| [best-practices](../../skills/cncf/best-practices/SKILL.md) | Provides Postgres performance optimization and best... | postgres best practices, database... |
| [bot-builder](../../skills/cncf/bot-builder/SKILL.md) | "Provides Build Slack apps using the Bolt framework across... | slack bot builder, api... |
| [bot-builder](../../skills/cncf/bot-builder/SKILL.md) | "Provides Expert in building Telegram bots that solve real... | telegram bot builder, api... |
| [buildpacks](../../skills/cncf/buildpacks/SKILL.md) | "Provides Buildpacks in Cloud-Native Engineering - Turn... | buildpacks, cloud-native... |
| [calico](../../skills/cncf/calico/SKILL.md) | "Calico in Cloud Native Security - cloud native... | calico, cdn... |
| [call-handoff-patterns](../../skills/cncf/call-handoff-patterns/SKILL.md) | Provides Effective patterns for on-call shift transitions,... | on call handoff patterns, reliability... |
| [cert-manager](../../skills/cncf/cert-manager/SKILL.md) | "cert-manager in Cloud-Native Engineering - Certificate... | cert manager, cert-manager... |
| [chaosmesh](../../skills/cncf/chaosmesh/SKILL.md) | ''Provides Chaos Mesh in Cloud-Native Engineering... | chaosmesh, chaos... |
| [chart-scaffolding](../../skills/cncf/chart-scaffolding/SKILL.md) | Provides Comprehensive guidance for creating, organizing,... | helm chart scaffolding, devops... |
| [cilium](../../skills/cncf/cilium/SKILL.md) | "Cilium in Cloud Native Network - cloud native... | cdn, cilium... |
| [cloud-architect](../../skills/cncf/cloud-architect/SKILL.md) | "Provides Expert hybrid cloud architect specializing in... | hybrid cloud architect, cloud... |
| [cloud-architecture](../../skills/cncf/cloud-architecture/SKILL.md) | "Provides Decision framework and patterns for architecting... | multi cloud architecture, cloud... |
| [cloud-custodian](../../skills/cncf/cloud-custodian/SKILL.md) | "Provides Cloud Custodian in Cloud-Native Engineering... | cloud custodian, cloud-custodian... |
| [cloud-networking](../../skills/cncf/cloud-networking/SKILL.md) | "Provides Configure secure, high-performance connectivity... | hybrid cloud networking, cloud... |
| [cloud-optimization-cost-optimize](../../skills/cncf/cloud-optimization-cost-optimize/SKILL.md) | Provides You are a cloud cost optimization expert... | database cloud optimization cost optimize, database... |
| [cloud-run](../../skills/cncf/cloud-run/SKILL.md) | "Provides Specialized skill for building production-ready... | gcp cloud run, cloud... |
| [cloudevents](../../skills/cncf/cloudevents/SKILL.md) | "CloudEvents in Streaming & Messaging - cloud native... | cdn, cloudevents... |
| [cni](../../skills/cncf/cni/SKILL.md) | "Cni in Cloud-Native Engineering - Container Network... | cloud-native, cni... |
| [communication-callautomation-java](../../skills/cncf/communication-callautomation-java/SKILL.md) | "Provides Build server-side call automation workflows... | azure communication callautomation java, cloud... |
| [communication-callingserver-java](../../skills/cncf/communication-callingserver-java/SKILL.md) | "Provides ⚠️ DEPRECATED: This SDK has been renamed to Call ... | azure communication callingserver java, cloud... |
| [communication-chat-java](../../skills/cncf/communication-chat-java/SKILL.md) | "Provides Build real-time chat applications with thread... | azure communication chat java, cloud... |
| [communication-common-java](../../skills/cncf/communication-common-java/SKILL.md) | "Provides Azure Communication Services common utilities for... | azure communication common java, cloud... |
| [communication-sms-java](../../skills/cncf/communication-sms-java/SKILL.md) | "Provides Send SMS messages with Azure Communication... | azure communication sms java, cloud... |
| [communications](../../skills/cncf/communications/SKILL.md) | 'Provides Build communication features with Twilio: SMS... | twilio communications, api... |
| [compute-batch-java](../../skills/cncf/compute-batch-java/SKILL.md) | "Provides Azure Batch SDK for Java. Run large-scale... | azure compute batch java, cloud... |
| [configurator](../../skills/cncf/configurator/SKILL.md) | "Provides Generate production-ready mise.toml setups for... | mise configurator, devops... |
| [container-network-interface-cni](../../skills/cncf/container-network-interface-cni/SKILL.md) | "Container Network Interface in Cloud Native Network -... | architecture, cdn... |
| [containerd](../../skills/cncf/containerd/SKILL.md) | "Containerd in Cloud-Native Engineering - An open and... | cloud-native, containerd... |
| [containerregistry-py](../../skills/cncf/containerregistry-py/SKILL.md) | "Provides Azure Container Registry SDK for Python. Use for... | azure containerregistry py, cloud... |
| [contour](../../skills/cncf/contour/SKILL.md) | "Contour in Service Proxy - cloud native architecture,... | cdn, contour... |
| [coredns](../../skills/cncf/coredns/SKILL.md) | "Coredns in Cloud-Native Engineering - CoreDNS is a DNS... | cloud-native, coredns... |
| [cortex](../../skills/cncf/cortex/SKILL.md) | "Cortex in Monitoring & Observability - distributed,... | cortex, distributed... |
| [cosmos-db-py](../../skills/cncf/cosmos-db-py/SKILL.md) | "Provides Build production-grade Azure Cosmos DB NoSQL... | azure cosmos db py, cloud... |
| [cosmos-java](../../skills/cncf/cosmos-java/SKILL.md) | Provides Azure Cosmos DB SDK for Java. NoSQL database... | azure cosmos java, cloud... |
| [cosmos-py](../../skills/cncf/cosmos-py/SKILL.md) | Provides Azure Cosmos DB SDK for Python (NoSQL API). Use... | azure cosmos py, cloud... |
| [cosmos-rust](../../skills/cncf/cosmos-rust/SKILL.md) | Provides Azure Cosmos DB SDK for Rust (NoSQL API). Use for... | azure cosmos rust, cloud... |
| [cosmos-ts](../../skills/cncf/cosmos-ts/SKILL.md) | Provides Azure Cosmos DB JavaScript/TypeScript SDK... | azure cosmos ts, cloud... |
| [cost-cleanup](../../skills/cncf/cost-cleanup/SKILL.md) | "Configures automated cleanup of unused aws resources to... | aws cost cleanup, cloud... |
| [cost-optimizer](../../skills/cncf/cost-optimizer/SKILL.md) | "Provides Comprehensive AWS cost analysis and optimization... | aws cost optimizer, cloud... |
| [cri-o](../../skills/cncf/cri-o/SKILL.md) | "Provides CRI-O in Container Runtime - OCI-compliant... | container, cri o... |
| [crossplane](../../skills/cncf/crossplane/SKILL.md) | "Crossplane in Platform Engineering - Kubernetes-native... | container orchestration, crossplane... |
| [cubefs](../../skills/cncf/cubefs/SKILL.md) | "Provides CubeFS in Storage - distributed, high-performance... | cubefs, distributed... |
| [dapr](../../skills/cncf/dapr/SKILL.md) | "Provides Dapr in Cloud-Native Engineering - distributed... | cloud-native, dapr... |
| [dashboards](../../skills/cncf/dashboards/SKILL.md) | Provides Create and manage production-ready Grafana... | grafana dashboards, devops... |
| [data-tables-java](../../skills/cncf/data-tables-java/SKILL.md) | "Provides Build table storage applications using the Azure... | azure data tables java, cloud... |
| [data-tables-py](../../skills/cncf/data-tables-py/SKILL.md) | "Provides Azure Tables SDK for Python (Storage and Cosmos... | azure data tables py, cloud... |
| [database-pentesting](../../skills/cncf/database-pentesting/SKILL.md) | "Provides Provide systematic methodologies for automated... | sqlmap database pentesting, database... |
| [debugging-debug-trace](../../skills/cncf/debugging-debug-trace/SKILL.md) | Provides You are a debugging expert specializing in setting... | distributed debugging debug trace, reliability... |
| [deploy](../../skills/cncf/deploy/SKILL.md) | "Provides DevOps e deploy de aplicacoes — Docker, CI/CD com... | devops deploy, devops... |
| [deployment](../../skills/cncf/deployment/SKILL.md) | Provides Deploy containerized frontend + backend... | azd deployment, cloud... |
| [design](../../skills/cncf/design/SKILL.md) | Provides Database design principles and decision-making.... | database design, database... |
| [development](../../skills/cncf/development/SKILL.md) | "Provides Expert patterns for Salesforce platform... | salesforce development, api... |
| [development](../../skills/cncf/development/SKILL.md) | "Provides Build Shopify apps, extensions, themes using... | shopify development, api... |
| [dragonfly](../../skills/cncf/dragonfly/SKILL.md) | "Provides Dragonfly in Cloud-Native Engineering - P2P file... | cloud-native, distribution... |
| [emissary-ingress](../../skills/cncf/emissary-ingress/SKILL.md) | "Provides Emissary-Ingress in Cloud-Native Engineering -... | cloud-native, emissary ingress... |
| [engineer](../../skills/cncf/engineer/SKILL.md) | Provides Expert deployment engineer specializing in modern... | deployment engineer, devops... |
| [engineer](../../skills/cncf/engineer/SKILL.md) | Provides Build production-ready monitoring, logging, and... | observability engineer, reliability... |
| [envoy](../../skills/cncf/envoy/SKILL.md) | "Envoy in Cloud-Native Engineering - Cloud-native... | cloud-native, engineering... |
| [etcd](../../skills/cncf/etcd/SKILL.md) | "Provides etcd in Cloud-Native Engineering - distributed... | cloud-native, distributed... |
| [eventgrid-dotnet](../../skills/cncf/eventgrid-dotnet/SKILL.md) | "Provides Azure Event Grid SDK for .NET. Client library for... | azure eventgrid dotnet, cloud... |
| [eventgrid-java](../../skills/cncf/eventgrid-java/SKILL.md) | "Provides Build event-driven applications with Azure Event... | azure eventgrid java, cloud... |
| [eventgrid-py](../../skills/cncf/eventgrid-py/SKILL.md) | "Provides Azure Event Grid SDK for Python. Use for... | azure eventgrid py, cloud... |
| [eventhub-dotnet](../../skills/cncf/eventhub-dotnet/SKILL.md) | "Configures azure event hubs sdk for .net for cloud-native... | azure eventhub dotnet, cloud... |
| [eventhub-java](../../skills/cncf/eventhub-java/SKILL.md) | Provides Build real-time streaming applications with Azure... | azure eventhub java, cloud... |
| [eventhub-py](../../skills/cncf/eventhub-py/SKILL.md) | "Provides Azure Event Hubs SDK for Python streaming. Use... | azure eventhub py, cloud... |
| [eventhub-rust](../../skills/cncf/eventhub-rust/SKILL.md) | Provides Azure Event Hubs SDK for Rust. Use for sending and... | azure eventhub rust, cloud... |
| [eventhub-ts](../../skills/cncf/eventhub-ts/SKILL.md) | Provides High-throughput event streaming and real-time data... | azure eventhub ts, cloud... |
| [expert](../../skills/cncf/expert/SKILL.md) | Provides You are an advanced Docker containerization expert... | docker expert, devops... |
| [expert](../../skills/cncf/expert/SKILL.md) | Provides Expert guidance for distributed NoSQL databases... | nosql expert, database... |
| [expert](../../skills/cncf/expert/SKILL.md) | Provides You are an expert in Prisma ORM with deep... | prisma expert, database... |
| [external-api-development](../../skills/cncf/external-api-development/SKILL.md) | "Provides this skill guides you through creating custom... | moodle external api development, api... |
| [falco](../../skills/cncf/falco/SKILL.md) | "Provides Falco in Cloud-Native Engineering - Cloud Native... | cdn, cloud-native... |
| [fintech](../../skills/cncf/fintech/SKILL.md) | "Provides Expert patterns for Plaid API integration... | plaid fintech, api... |
| [firebase](../../skills/cncf/firebase/SKILL.md) | "Provides Firebase gives you a complete backend in minutes... | firebase, cloud... |
| [flatcar-container-linux](../../skills/cncf/flatcar-container-linux/SKILL.md) | "Provides Flatcar Container Linux in Cloud-Native... | cloud-native, engineering... |
| [fluentd](../../skills/cncf/fluentd/SKILL.md) | "Fluentd unified logging layer for collecting,... | fluentd, log collection... |
| [fluid](../../skills/cncf/fluid/SKILL.md) | "Fluid in A Kubernetes-native data acceleration layer for... | acceleration, container orchestration... |
| [flux](../../skills/cncf/flux/SKILL.md) | "Configures flux in cloud-native engineering - gitops for... | cloud-native, declarative... |
| [gcp-autoscaling](../../skills/cncf/gcp-autoscaling/SKILL.md) | "Provides Automatically scales compute resources based on... | autoscaling, auto-scaling... |
| [gcp-cloud-cdn](../../skills/cncf/gcp-cloud-cdn/SKILL.md) | Provides Content delivery network for caching and globally... | cloud cdn, cdn... |
| [gcp-cloud-dns](../../skills/cncf/gcp-cloud-dns/SKILL.md) | Manages DNS with health checks, traffic routing, and... | cloud dns, dns... |
| [gcp-cloud-functions](../../skills/cncf/gcp-cloud-functions/SKILL.md) | Deploys serverless functions triggered by events with... | cloud functions, serverless... |
| [gcp-cloud-kms](../../skills/cncf/gcp-cloud-kms/SKILL.md) | "Manages encryption keys for data protection with automated... | kms, key management... |
| [gcp-cloud-load-balancing](../../skills/cncf/gcp-cloud-load-balancing/SKILL.md) | "Provides Distributes traffic across instances with... | load balancing, traffic distribution... |
| [gcp-cloud-monitoring](../../skills/cncf/gcp-cloud-monitoring/SKILL.md) | "Monitors GCP resources with metrics, logging, and alerting... | cloud monitoring, monitoring... |
| [gcp-cloud-operations](../../skills/cncf/gcp-cloud-operations/SKILL.md) | "Provides Systems management including monitoring, logging,... | cloud operations, monitoring... |
| [gcp-cloud-pubsub](../../skills/cncf/gcp-cloud-pubsub/SKILL.md) | "Asynchronous messaging service for event streaming and... | pubsub, messaging... |
| [gcp-cloud-sql](../../skills/cncf/gcp-cloud-sql/SKILL.md) | "Provides managed relational databases (MySQL, PostgreSQL)... | cloud sql, relational database... |
| [gcp-cloud-storage](../../skills/cncf/gcp-cloud-storage/SKILL.md) | "Provides Stores objects with versioning, lifecycle... | cloud storage, gcs... |
| [gcp-cloud-tasks](../../skills/cncf/gcp-cloud-tasks/SKILL.md) | "Manages task queues for asynchronous job execution with... | cloud tasks, task queue... |
| [gcp-compute-engine](../../skills/cncf/gcp-compute-engine/SKILL.md) | "Deploys and manages virtual machine instances with... | compute engine, gce... |
| [gcp-container-registry](../../skills/cncf/gcp-container-registry/SKILL.md) | "Provides Stores and manages container images with... | container registry, gcr... |
| [gcp-deployment-manager](../../skills/cncf/gcp-deployment-manager/SKILL.md) | "Infrastructure as code using YAML templates for repeatable... | deployment manager, infrastructure as code... |
| [gcp-firestore](../../skills/cncf/gcp-firestore/SKILL.md) | Provides NoSQL document database with real-time sync,... | firestore, nosql... |
| [gcp-gke](../../skills/cncf/gcp-gke/SKILL.md) | "Provides Managed Kubernetes cluster with automatic... | gke, kubernetes... |
| [gcp-iam](../../skills/cncf/gcp-iam/SKILL.md) | "Manages identity and access control with service accounts,... | iam, identity access management... |
| [gcp-secret-manager](../../skills/cncf/gcp-secret-manager/SKILL.md) | "Provides Stores and rotates secrets with encryption and... | secret manager, secrets... |
| [gcp-vpc](../../skills/cncf/gcp-vpc/SKILL.md) | "Provides networking with subnets, firewall rules, and VPC... | vpc, virtual private cloud... |
| [grpc](../../skills/cncf/grpc/SKILL.md) | "gRPC in Remote Procedure Call - cloud native architecture,... | cdn, grpc... |
| [harbor](../../skills/cncf/harbor/SKILL.md) | "Configures harbor in cloud-native engineering - container... | cloud-native, container... |
| [helm](../../skills/cncf/helm/SKILL.md) | "Provides Helm in Cloud-Native Engineering - The Kubernetes... | cloud-native, container orchestration... |
| [identity-dotnet](../../skills/cncf/identity-dotnet/SKILL.md) | "Provides Azure Identity SDK for .NET. Authentication... | azure identity dotnet, cloud... |
| [identity-java](../../skills/cncf/identity-java/SKILL.md) | "Provides Authenticate Java applications with Azure... | azure identity java, cloud... |
| [identity-py](../../skills/cncf/identity-py/SKILL.md) | "Provides Azure Identity SDK for Python authentication. Use... | azure identity py, cloud... |
| [identity-rust](../../skills/cncf/identity-rust/SKILL.md) | "Provides Azure Identity SDK for Rust authentication. Use... | azure identity rust, cloud... |
| [identity-ts](../../skills/cncf/identity-ts/SKILL.md) | "Provides Authenticate to Azure services with various... | azure identity ts, cloud... |
| [implementation](../../skills/cncf/implementation/SKILL.md) | Provides Framework for defining and implementing Service... | slo implementation, reliability... |
| [in-toto](../../skills/cncf/in-toto/SKILL.md) | "in-toto in Supply Chain Security - cloud native... | chain, in toto... |
| [integration](../../skills/cncf/integration/SKILL.md) | "Provides Expert patterns for HubSpot CRM integration... | hubspot integration, api... |
| [integration](../../skills/cncf/integration/SKILL.md) | "Provides Integrate Stripe, PayPal, and payment processors.... | payment integration, api... |
| [integration](../../skills/cncf/integration/SKILL.md) | "Provides Master PayPal payment integration including... | paypal integration, api... |
| [integration](../../skills/cncf/integration/SKILL.md) | "Provides Master Stripe payment processing integration for... | stripe integration, api... |
| [integration](../../skills/cncf/integration/SKILL.md) | "Provides Integration skill for searching and fetching... | unsplash integration, api... |
| [istio](../../skills/cncf/istio/SKILL.md) | "Istio in Cloud-Native Engineering - Connect, secure,... | cloud-native, connect... |
| [jaeger](../../skills/cncf/jaeger/SKILL.md) | "Configures jaeger in cloud-native engineering -... | cloud-native, distributed... |
| [karmada](../../skills/cncf/karmada/SKILL.md) | "Provides Karmada in Cloud-Native Engineering -... | cloud-native, engineering... |
| [keda](../../skills/cncf/keda/SKILL.md) | "Configures keda in cloud-native engineering - event-driven... | cloud-native, engineering... |
| [keycloak](../../skills/cncf/keycloak/SKILL.md) | "Provides Keycloak in Cloud-Native Engineering - identity... | cloud-native, engineering... |
| [keyvault-certificates-rust](../../skills/cncf/keyvault-certificates-rust/SKILL.md) | "Provides Azure Key Vault Certificates SDK for Rust. Use... | azure keyvault certificates rust, cloud... |
| [keyvault-keys-rust](../../skills/cncf/keyvault-keys-rust/SKILL.md) | "Provides Azure Key Vault Keys SDK for Rust. Use for... | azure keyvault keys rust, cloud... |
| [keyvault-keys-ts](../../skills/cncf/keyvault-keys-ts/SKILL.md) | "Provides Manage cryptographic keys using Azure Key Vault... | azure keyvault keys ts, cloud... |
| [keyvault-py](../../skills/cncf/keyvault-py/SKILL.md) | "Provides Azure Key Vault SDK for Python. Use for secrets,... | azure keyvault py, cloud... |
| [keyvault-secrets-rust](../../skills/cncf/keyvault-secrets-rust/SKILL.md) | "Provides Azure Key Vault Secrets SDK for Rust. Use for... | azure keyvault secrets rust, cloud... |
| [keyvault-secrets-ts](../../skills/cncf/keyvault-secrets-ts/SKILL.md) | "Provides Manage secrets using Azure Key Vault Secrets SDK... | azure keyvault secrets ts, cloud... |
| [knative](../../skills/cncf/knative/SKILL.md) | "Provides Knative in Cloud-Native Engineering - serverless... | cloud-native, engineering... |
| [kong](../../skills/cncf/kong/SKILL.md) | "Kong in API Gateway - cloud native architecture, patterns,... | cdn, gateway... |
| [kong-ingress-controller](../../skills/cncf/kong-ingress-controller/SKILL.md) | "Kong Ingress Controller in Kubernetes - cloud native... | kong ingress controller, kong-ingress-controller... |
| [krustlet](../../skills/cncf/krustlet/SKILL.md) | "Krustlet in Kubernetes Runtime - cloud native... | cdn, container orchestration... |
| [kserve](../../skills/cncf/kserve/SKILL.md) | "Configures kserve in cloud-native engineering - model... | cloud-native, engineering... |
| [kubeedge](../../skills/cncf/kubeedge/SKILL.md) | "Configures kubeedge in cloud-native engineering - edge... | cloud-native, computing... |
| [kubeflow](../../skills/cncf/kubeflow/SKILL.md) | "Configures kubeflow in cloud-native engineering - ml on... | cloud-native, container orchestration... |
| [kubernetes](../../skills/cncf/kubernetes/SKILL.md) | "Kubernetes in Cloud-Native Engineering - Production-Grade... | cloud-native, container orchestration... |
| [kubescape](../../skills/cncf/kubescape/SKILL.md) | "Configures kubescape in cloud-native engineering -... | cloud-native, container orchestration... |
| [kubevela](../../skills/cncf/kubevela/SKILL.md) | "Configures kubevela in cloud-native engineering -... | application, cloud-native... |
| [kubevirt](../../skills/cncf/kubevirt/SKILL.md) | "Provides KubeVirt in Cloud-Native Engineering -... | cloud-native, engineering... |
| [kuma](../../skills/cncf/kuma/SKILL.md) | "Kuma in Service Mesh - cloud native architecture,... | cdn, infrastructure as code... |
| [kyverno](../../skills/cncf/kyverno/SKILL.md) | "Configures kyverno in cloud-native engineering - policy... | cloud-native, engineering... |
| [lima](../../skills/cncf/lima/SKILL.md) | "Lima in Container Runtime - cloud native architecture,... | cdn, container... |
| [linkerd](../../skills/cncf/linkerd/SKILL.md) | "Linkerd in Service Mesh - cloud native architecture,... | cdn, infrastructure as code... |
| [litmus](../../skills/cncf/litmus/SKILL.md) | "Litmus in Chaos Engineering - cloud native architecture,... | cdn, chaos... |
| [longhorn](../../skills/cncf/longhorn/SKILL.md) | "Longhorn in Cloud Native Storage - cloud native... | cdn, infrastructure as code... |
| [management](../../skills/cncf/management/SKILL.md) | Provides Server management principles and decision-making.... | server management, reliability... |
| [manifest-generator](../../skills/cncf/manifest-generator/SKILL.md) | Provides Step-by-step guidance for creating... | k8s manifest generator, devops... |
| [maps-search-dotnet](../../skills/cncf/maps-search-dotnet/SKILL.md) | "Provides Azure Maps SDK for .NET. Location-based services... | azure maps search dotnet, cloud... |
| [mesh-expert](../../skills/cncf/mesh-expert/SKILL.md) | Provides Expert service mesh architect specializing in... | service mesh expert, reliability... |
| [mesh-observability](../../skills/cncf/mesh-observability/SKILL.md) | Provides Complete guide to observability patterns for... | service mesh observability, devops... |
| [messaging-webpubsub-java](../../skills/cncf/messaging-webpubsub-java/SKILL.md) | "Provides Build real-time web applications with Azure Web... | azure messaging webpubsub java, cloud... |
| [messaging-webpubsubservice-py](../../skills/cncf/messaging-webpubsubservice-py/SKILL.md) | "Provides Azure Web PubSub Service SDK for Python. Use for... | azure messaging webpubsubservice py, cloud... |
| [metal3-io](../../skills/cncf/metal3-io/SKILL.md) | "metal3.io in Bare Metal Provisioning - cloud native... | cdn, infrastructure as code... |
| [mgmt-apicenter-dotnet](../../skills/cncf/mgmt-apicenter-dotnet/SKILL.md) | "Provides Azure API Center SDK for .NET. Centralized API... | azure mgmt apicenter dotnet, cloud... |
| [mgmt-apicenter-py](../../skills/cncf/mgmt-apicenter-py/SKILL.md) | Provides Azure API Center Management SDK for Python. Use... | azure mgmt apicenter py, cloud... |
| [mgmt-apimanagement-dotnet](../../skills/cncf/mgmt-apimanagement-dotnet/SKILL.md) | "Configures azure resource manager sdk for api management... | azure mgmt apimanagement dotnet, cloud... |
| [mgmt-apimanagement-py](../../skills/cncf/mgmt-apimanagement-py/SKILL.md) | "Provides Azure API Management SDK for Python. Use for... | azure mgmt apimanagement py, cloud... |
| [mgmt-applicationinsights-dotnet](../../skills/cncf/mgmt-applicationinsights-dotnet/SKILL.md) | "Provides Azure Application Insights SDK for .NET.... | azure mgmt applicationinsights dotnet, cloud... |
| [mgmt-arizeaiobservabilityeval-dotnet](../../skills/cncf/mgmt-arizeaiobservabilityeval-dotnet/SKILL.md) | "Provides Azure Resource Manager SDK for Arize AI... | azure mgmt arizeaiobservabilityeval dotnet, cloud... |
| [mgmt-botservice-dotnet](../../skills/cncf/mgmt-botservice-dotnet/SKILL.md) | "Provides Azure Resource Manager SDK for Bot Service in... | azure mgmt botservice dotnet, cloud... |
| [mgmt-botservice-py](../../skills/cncf/mgmt-botservice-py/SKILL.md) | "Provides Azure Bot Service Management SDK for Python. Use... | azure mgmt botservice py, cloud... |
| [mgmt-fabric-dotnet](../../skills/cncf/mgmt-fabric-dotnet/SKILL.md) | "Configures azure resource manager sdk for fabric in .net... | azure mgmt fabric dotnet, cloud... |
| [mgmt-fabric-py](../../skills/cncf/mgmt-fabric-py/SKILL.md) | "Provides Azure Fabric Management SDK for Python. Use for... | azure mgmt fabric py, cloud... |
| [mgmt-mongodbatlas-dotnet](../../skills/cncf/mgmt-mongodbatlas-dotnet/SKILL.md) | "Provides Manage MongoDB Atlas Organizations as Azure ARM... | azure mgmt mongodbatlas dotnet, cloud... |
| [mgmt-weightsandbiases-dotnet](../../skills/cncf/mgmt-weightsandbiases-dotnet/SKILL.md) | "Provides Azure Weights & Biases SDK for .NET. ML... | azure mgmt weightsandbiases dotnet, cloud... |
| [microsoft-playwright-testing-ts](../../skills/cncf/microsoft-playwright-testing-ts/SKILL.md) | Provides Run Playwright tests at scale with cloud-hosted... | azure microsoft playwright testing ts, cloud... |
| [migration](../../skills/cncf/migration/SKILL.md) | "Provides Master database schema and data migrations across... | database migration, database... |
| [migrations-migration-observability](../../skills/cncf/migrations-migration-observability/SKILL.md) | Configures migration monitoring, cdc, and observability... | database migrations migration observability, database... |
| [migrations-sql-migrations](../../skills/cncf/migrations-sql-migrations/SKILL.md) | Provides SQL database migrations with zero-downtime... | database migrations sql migrations, database... |
| [module-library](../../skills/cncf/module-library/SKILL.md) | Provides Production-ready Terraform module patterns for... | terraform module library, devops... |
| [monitor-ingestion-java](../../skills/cncf/monitor-ingestion-java/SKILL.md) | Provides Azure Monitor Ingestion SDK for Java. Send custom... | azure monitor ingestion java, cloud... |
| [monitor-ingestion-py](../../skills/cncf/monitor-ingestion-py/SKILL.md) | "Provides Azure Monitor Ingestion SDK for Python. Use for... | azure monitor ingestion py, cloud... |
| [monitor-opentelemetry-exporter-java](../../skills/cncf/monitor-opentelemetry-exporter-java/SKILL.md) | "Provides Azure Monitor OpenTelemetry Exporter for Java.... | azure monitor opentelemetry exporter java, cloud... |
| [monitor-opentelemetry-exporter-py](../../skills/cncf/monitor-opentelemetry-exporter-py/SKILL.md) | "Provides Azure Monitor OpenTelemetry Exporter for Python.... | azure monitor opentelemetry exporter py, cloud... |
| [monitor-opentelemetry-py](../../skills/cncf/monitor-opentelemetry-py/SKILL.md) | "Provides Azure Monitor OpenTelemetry Distro for Python.... | azure monitor opentelemetry py, cloud... |
| [monitor-opentelemetry-ts](../../skills/cncf/monitor-opentelemetry-ts/SKILL.md) | "Provides Auto-instrument Node.js applications with... | azure monitor opentelemetry ts, cloud... |
| [monitor-query-java](../../skills/cncf/monitor-query-java/SKILL.md) | "Provides Azure Monitor Query SDK for Java. Execute Kusto... | azure monitor query java, cloud... |
| [monitor-query-py](../../skills/cncf/monitor-query-py/SKILL.md) | "Provides Azure Monitor Query SDK for Python. Use for... | azure monitor query py, cloud... |
| [monitoring-monitor-setup](../../skills/cncf/monitoring-monitor-setup/SKILL.md) | "Provides You are a monitoring and observability expert... | observability monitoring monitor setup, devops... |
| [monitoring-slo-implement](../../skills/cncf/monitoring-slo-implement/SKILL.md) | "Provides You are an SLO (Service Level Objective) expert... | observability monitoring slo implement, devops... |
| [multi-tenant](../../skills/cncf/multi-tenant/SKILL.md) | "Provides Design and implement multi-tenant SaaS... | saas multi tenant, database... |
| [nats](../../skills/cncf/nats/SKILL.md) | "NATS in Cloud Native Messaging - cloud native... | cdn, infrastructure as code... |
| [neon](../../skills/cncf/neon/SKILL.md) | Provides Neon is a serverless Postgres platform that... | using neon, database... |
| [networking-osi](../../skills/cncf/networking-osi/SKILL.md) | "OSI Model Networking for Cloud-Native - All 7 layers with... | cloud-native, layers... |
| [notary-project](../../skills/cncf/notary-project/SKILL.md) | "Notary Project in Content Trust &amp; Security - cloud... | content, how do i find security issues... |
| [oathkeeper](../../skills/cncf/oathkeeper/SKILL.md) | "Oathkeeper in Identity & Access - cloud native... | access, cdn... |
| [open-policy-agent-opa](../../skills/cncf/open-policy-agent-opa/SKILL.md) | "Open Policy Agent in Security &amp; Compliance - cloud... | open policy agent opa, open-policy-agent-opa... |
| [open-telemetry](../../skills/cncf/open-telemetry/SKILL.md) | "OpenTelemetry in Observability - cloud native... | cdn, infrastructure as code... |
| [opencost](../../skills/cncf/opencost/SKILL.md) | "OpenCost in Kubernetes Cost Monitoring - cloud native... | cdn, container orchestration... |
| [openfeature](../../skills/cncf/openfeature/SKILL.md) | "OpenFeature in Feature Flagging - cloud native... | cdn, feature... |
| [openfga](../../skills/cncf/openfga/SKILL.md) | "OpenFGA in Security &amp; Compliance - cloud native... | cdn, compliance... |
| [openkruise](../../skills/cncf/openkruise/SKILL.md) | "OpenKruise in Extended Kubernetes workload management with... | container orchestration, extended... |
| [opentelemetry](../../skills/cncf/opentelemetry/SKILL.md) | "OpenTelemetry in Observability framework for tracing,... | framework, observability... |
| [openyurt](../../skills/cncf/openyurt/SKILL.md) | ''Provides OpenYurt in Extending Kubernetes to edge... | openyurt, extending... |
| [operator-framework](../../skills/cncf/operator-framework/SKILL.md) | "Operator Framework in Tools to build and manage Kubernetes... | build, manage... |
| [optimization](../../skills/cncf/optimization/SKILL.md) | "Provides Strategies and patterns for optimizing cloud... | cost optimization, cloud... |
| [optimization-patterns](../../skills/cncf/optimization-patterns/SKILL.md) | Provides Transform slow database queries into... | sql optimization patterns, database... |
| [optimizer](../../skills/cncf/optimizer/SKILL.md) | Provides Expert database optimizer specializing in modern... | database optimizer, database... |
| [orm-expert](../../skills/cncf/orm-expert/SKILL.md) | "Provides Expert in Drizzle ORM for TypeScript — schema... | drizzle orm expert, database... |
| [ory-hydra](../../skills/cncf/ory-hydra/SKILL.md) | "ORY Hydra in Security & Compliance - cloud native... | ory hydra, ory-hydra... |
| [ory-kratos](../../skills/cncf/ory-kratos/SKILL.md) | "ORY Kratos in Identity & Access - cloud native... | access, cdn... |
| [patterns](../../skills/cncf/patterns/SKILL.md) | "Provides Common AWS CDK patterns and constructs for... | cdk patterns, cloud... |
| [payments-stack](../../skills/cncf/payments-stack/SKILL.md) | "Provides Design and implement production-grade Pakistani... | pakistan payments stack, api... |
| [penetration-testing](../../skills/cncf/penetration-testing/SKILL.md) | Provides Provide comprehensive techniques for penetration... | aws penetration testing, cloud... |
| [penetration-testing](../../skills/cncf/penetration-testing/SKILL.md) | Provides Conduct comprehensive security assessments of... | cloud penetration testing, cloud... |
| [performance-performance-optimization](../../skills/cncf/performance-performance-optimization/SKILL.md) | Provides Optimize end-to-end application performance with... | application performance performance optimization, reliability... |
| [pipeline-design](../../skills/cncf/pipeline-design/SKILL.md) | Provides Architecture patterns for multi-stage CI/CD... | deployment pipeline design, devops... |
| [postgres](../../skills/cncf/postgres/SKILL.md) | Provides Provision instant temporary Postgres databases via... | claimable postgres, database... |
| [postgres](../../skills/cncf/postgres/SKILL.md) | Provides Expert patterns for Neon serverless Postgres,... | neon postgres, database... |
| [postgres-ts](../../skills/cncf/postgres-ts/SKILL.md) | Provides Connect to Azure Database for PostgreSQL Flexible... | azure postgres ts, cloud... |
| [postgresql](../../skills/cncf/postgresql/SKILL.md) | Provides Design a PostgreSQL-specific schema. Covers... | postgresql, database... |
| [procedures](../../skills/cncf/procedures/SKILL.md) | Provides Production deployment principles and... | deployment procedures, devops... |
| [process-architecture](../../skills/cncf/process-architecture/SKILL.md) | "Creates or updates ARCHITECTURE.md documenting the... | creates, documenting... |
| [process-incident-response](../../skills/cncf/process-incident-response/SKILL.md) | "Creates or updates an incident response plan covering... | covering, creates... |
| [process-releases](../../skills/cncf/process-releases/SKILL.md) | "Creates or updates RELEASES.md documenting the release... | creates, documenting... |
| [process-security-policy](../../skills/cncf/process-security-policy/SKILL.md) | "Creates or updates SECURITY.md defining the vulnerability... | creates, defining... |
| [prometheus](../../skills/cncf/prometheus/SKILL.md) | "Prometheus in Cloud-Native Engineering - The Prometheus... | cloud-native, engineering... |
| [resource-manager-cosmosdb-dotnet](../../skills/cncf/resource-manager-cosmosdb-dotnet/SKILL.md) | "Configures azure resource manager sdk for cosmos db in... | azure resource manager cosmosdb dotnet, cloud... |
| [resource-manager-durabletask-dotnet](../../skills/cncf/resource-manager-durabletask-dotnet/SKILL.md) | "Provides Azure Resource Manager SDK for Durable Task... | azure resource manager durabletask dotnet, cloud... |
| [resource-manager-mysql-dotnet](../../skills/cncf/resource-manager-mysql-dotnet/SKILL.md) | Provides Azure MySQL Flexible Server SDK for .NET. Database... | azure resource manager mysql dotnet, cloud... |
| [resource-manager-playwright-dotnet](../../skills/cncf/resource-manager-playwright-dotnet/SKILL.md) | "Provides Azure Resource Manager SDK for Microsoft... | azure resource manager playwright dotnet, cloud... |
| [resource-manager-postgresql-dotnet](../../skills/cncf/resource-manager-postgresql-dotnet/SKILL.md) | Provides Azure PostgreSQL Flexible Server SDK for .NET.... | azure resource manager postgresql dotnet, cloud... |
| [resource-manager-redis-dotnet](../../skills/cncf/resource-manager-redis-dotnet/SKILL.md) | Configures azure resource manager sdk for redis in .net for... | azure resource manager redis dotnet, cloud... |
| [resource-manager-sql-dotnet](../../skills/cncf/resource-manager-sql-dotnet/SKILL.md) | "Configures azure resource manager sdk for azure sql in... | azure resource manager sql dotnet, cloud... |
| [responder](../../skills/cncf/responder/SKILL.md) | Provides Expert SRE incident responder specializing in... | incident responder, reliability... |
| [response-incident-response](../../skills/cncf/response-incident-response/SKILL.md) | "Configures use when working with incident response... | incident response incident response, devops... |
| [response-smart-fix](../../skills/cncf/response-smart-fix/SKILL.md) | 'Provides [Extended thinking: This workflow implements a... | incident response smart fix, devops... |
| [rook](../../skills/cncf/rook/SKILL.md) | "Configures rook in cloud-native storage orchestration for... | cloud-native, orchestration... |
| [runbook-templates](../../skills/cncf/runbook-templates/SKILL.md) | "Provides Production-ready templates for incident response... | incident runbook templates, devops... |
| [search](../../skills/cncf/search/SKILL.md) | "Provides Expert patterns for Algolia search... | algolia search, api... |
| [search-documents-dotnet](../../skills/cncf/search-documents-dotnet/SKILL.md) | "Provides Azure AI Search SDK for .NET... | azure search documents dotnet, cloud... |
| [search-documents-py](../../skills/cncf/search-documents-py/SKILL.md) | "Provides Azure AI Search SDK for Python. Use for vector... | azure search documents py, cloud... |
| [search-documents-ts](../../skills/cncf/search-documents-ts/SKILL.md) | "Provides Build search applications with vector, hybrid,... | azure search documents ts, cloud... |
| [security-keyvault-keys-dotnet](../../skills/cncf/security-keyvault-keys-dotnet/SKILL.md) | Provides Azure Key Vault Keys SDK for .NET. Client library... | azure security keyvault keys dotnet, cloud... |
| [security-keyvault-keys-java](../../skills/cncf/security-keyvault-keys-java/SKILL.md) | Provides Azure Key Vault Keys Java SDK for cryptographic... | azure security keyvault keys java, cloud... |
| [security-keyvault-secrets-java](../../skills/cncf/security-keyvault-secrets-java/SKILL.md) | Provides Azure Key Vault Secrets Java SDK for secret... | azure security keyvault secrets java, cloud... |
| [security-policies](../../skills/cncf/security-policies/SKILL.md) | Provides Comprehensive guide for implementing... | k8s security policies, devops... |
| [serverless](../../skills/cncf/serverless/SKILL.md) | "Provides Specialized skill for building production-ready... | aws serverless, cloud... |
| [servicebus-dotnet](../../skills/cncf/servicebus-dotnet/SKILL.md) | "Provides Azure Service Bus SDK for .NET. Enterprise... | azure servicebus dotnet, cloud... |
| [servicebus-py](../../skills/cncf/servicebus-py/SKILL.md) | "Provides Azure Service Bus SDK for Python messaging. Use... | azure servicebus py, cloud... |
| [servicebus-ts](../../skills/cncf/servicebus-ts/SKILL.md) | "Configures enterprise messaging with queues, topics, and... | azure servicebus ts, cloud... |
| [skill](../../skills/cncf/skill/SKILL.md) | Configures terraform infrastructure as code best practices... | terraform skill, devops... |
| [skills](../../skills/cncf/skills/SKILL.md) | "Provides AWS development with infrastructure automation... | aws skills, cloud... |
| [spec-generation](../../skills/cncf/spec-generation/SKILL.md) | "Provides Generate and maintain OpenAPI 3.1 specifications... | openapi spec generation, api... |
| [specialist](../../skills/cncf/specialist/SKILL.md) | Provides Expert Terraform/OpenTofu specialist mastering... | terraform specialist, devops... |
| [speech-to-text-rest-py](../../skills/cncf/speech-to-text-rest-py/SKILL.md) | "Provides Azure Speech to Text REST API for short audio... | azure speech to text rest py, cloud... |
| [spiffe](../../skills/cncf/spiffe/SKILL.md) | "Provides SPIFFE in Secure Product Identity Framework for... | identity, product... |
| [spire](../../skills/cncf/spire/SKILL.md) | "Configures spire in spiffe implementation for real-world... | implementation, real-world... |
| [storage-blob-java](../../skills/cncf/storage-blob-java/SKILL.md) | "Provides Build blob storage applications using the Azure... | azure storage blob java, cloud... |
| [storage-blob-py](../../skills/cncf/storage-blob-py/SKILL.md) | "Provides Azure Blob Storage SDK for Python. Use for... | azure storage blob py, cloud... |
| [storage-blob-rust](../../skills/cncf/storage-blob-rust/SKILL.md) | "Provides Azure Blob Storage SDK for Rust. Use for... | azure storage blob rust, cloud... |
| [storage-blob-ts](../../skills/cncf/storage-blob-ts/SKILL.md) | "Provides Azure Blob Storage JavaScript/TypeScript SDK... | azure storage blob ts, cloud... |
| [storage-file-datalake-py](../../skills/cncf/storage-file-datalake-py/SKILL.md) | Provides Azure Data Lake Storage Gen2 SDK for Python. Use... | azure storage file datalake py, cloud... |
| [storage-file-share-py](../../skills/cncf/storage-file-share-py/SKILL.md) | "Provides Azure Storage File Share SDK for Python. Use for... | azure storage file share py, cloud... |
| [storage-file-share-ts](../../skills/cncf/storage-file-share-ts/SKILL.md) | "Provides Azure File Share JavaScript/TypeScript SDK... | azure storage file share ts, cloud... |
| [storage-queue-py](../../skills/cncf/storage-queue-py/SKILL.md) | "Provides Azure Queue Storage SDK for Python. Use for... | azure storage queue py, cloud... |
| [storage-queue-ts](../../skills/cncf/storage-queue-ts/SKILL.md) | "Provides Azure Queue Storage JavaScript/TypeScript SDK... | azure storage queue ts, cloud... |
| [strimzi](../../skills/cncf/strimzi/SKILL.md) | "Provides Strimzi in Kafka on Kubernetes - Apache Kafka for... | apache, container orchestration... |
| [teams-automation](../../skills/cncf/teams-automation/SKILL.md) | 'Provides Automate Microsoft Teams tasks via Rube MCP... | microsoft teams automation, api... |
| [tekton](../../skills/cncf/tekton/SKILL.md) | "Provides Tekton in Cloud-Native Engineering - A... | cloud-native, engineering... |
| [thanos](../../skills/cncf/thanos/SKILL.md) | "Provides Thanos in High availability Prometheus solution... | availability, metrics... |
| [the-update-framework-tuf](../../skills/cncf/the-update-framework-tuf/SKILL.md) | "The Update Framework (TUF) in Secure software update... | protecting, secure... |
| [tikv](../../skills/cncf/tikv/SKILL.md) | "TiKV in Distributed transactional key-value database... | distributed, key-value... |
| [tracing](../../skills/cncf/tracing/SKILL.md) | Provides Implement distributed tracing with Jaeger and... | distributed tracing, reliability... |
| [traffic-management](../../skills/cncf/traffic-management/SKILL.md) | Provides Comprehensive guide to Istio traffic management... | istio traffic management, cloud... |
| [troubleshooter](../../skills/cncf/troubleshooter/SKILL.md) | "Provides Expert DevOps troubleshooter specializing in... | devops troubleshooter, devops... |
| [use-guardian](../../skills/cncf/use-guardian/SKILL.md) | "Provides FREE — Intelligent tool-call reliability wrapper.... | tool use guardian, reliability... |
| [validation-config-validate](../../skills/cncf/validation-config-validate/SKILL.md) | Provides You are a configuration management expert... | deployment validation config validate, devops... |
| [vitess](../../skills/cncf/vitess/SKILL.md) | "Provides Vitess in Database clustering system for... | clustering, system... |
| [volcano](../../skills/cncf/volcano/SKILL.md) | "Configures volcano in batch scheduling infrastructure for... | batch, cloud infrastructure... |
| [wasmcloud](../../skills/cncf/wasmcloud/SKILL.md) | "Provides wasmCloud in WebAssembly-based distributed... | applications, distributed... |
| [web-pubsub-ts](../../skills/cncf/web-pubsub-ts/SKILL.md) | "Provides Real-time messaging with WebSocket connections... | azure web pubsub ts, cloud... |
| [workflow](../../skills/cncf/workflow/SKILL.md) | "Provides Complete guide to implementing GitOps workflows... | gitops workflow, devops... |
| [writing](../../skills/cncf/writing/SKILL.md) | Provides Comprehensive guide to writing effective,... | postmortem writing, reliability... |
| [zot](../../skills/cncf/zot/SKILL.md) | "Zot in Container Registry - cloud native architecture,... | cdn, container... |


### Coding (319 skills)

| Skill Name | Description | Triggers |
|---|---|---|
| [101](../../skills/coding/101/SKILL.md) | "Provides Configure and test common network services (HTTP,... | network 101, testing... |
| [access-review](../../skills/coding/access-review/SKILL.md) | "Implements django-access-review patterns for software... | django access review, backend... |
| [accessibility](../../skills/coding/accessibility/SKILL.md) | "Provides Audit and fix HTML accessibility issues including... | fixing accessibility, front... |
| [advanced-types](../../skills/coding/advanced-types/SKILL.md) | "Provides Comprehensive guidance for mastering TypeScript's... | typescript advanced types, code... |
| [aeo-check](../../skills/coding/aeo-check/SKILL.md) | "Provides Score any MCP server, API, or CLI for... | clarvia aeo check, tool... |
| [agent-skills](../../skills/coding/agent-skills/SKILL.md) | "Provides Production-grade test automation skills for 46... | lambdatest agent skills, testing... |
| [analysis](../../skills/coding/analysis/SKILL.md) | "Provides Execute comprehensive network traffic analysis... | wireshark analysis, security... |
| [analysis-patterns](../../skills/coding/analysis-patterns/SKILL.md) | "Provides Comprehensive patterns and techniques for... | binary analysis patterns, security... |
| [analysis-patterns](../../skills/coding/analysis-patterns/SKILL.md) | "Provides Apply STRIDE methodology to systematically... | stride analysis patterns, security... |
| [analyst](../../skills/coding/analyst/SKILL.md) | "Provides Expert firmware analyst specializing in embedded... | firmware analyst, security... |
| [analyst](../../skills/coding/analyst/SKILL.md) | "Provides Expert malware analyst specializing in defensive... | malware analyst, security... |
| [api-integration-patterns](../../skills/coding/api-integration-patterns/SKILL.md) | "Provides Production-ready patterns for integrating... | frontend api integration patterns, frontend... |
| [app-router-patterns](../../skills/coding/app-router-patterns/SKILL.md) | "Provides Comprehensive patterns for Next.js 14+ App Router... | nextjs app router patterns, framework... |
| [appdeploy](../../skills/coding/appdeploy/SKILL.md) | "Provides Deploy web apps with backend APIs, database, and... | appdeploy, backend... |
| [architect](../../skills/coding/architect/SKILL.md) | "Provides Expert backend architect specializing in scalable... | backend architect, backend... |
| [architect](../../skills/coding/architect/SKILL.md) | "Creates comprehensive technical documentation from... | docs architect, architecture... |
| [architect](../../skills/coding/architect/SKILL.md) | "Provides Master modern GraphQL with federation,... | graphql architect, architecture... |
| [architectural-patterns](../../skills/coding/architectural-patterns/SKILL.md) | "Provides Software architecture patterns including MVC,... | architectural patterns, system design... |
| [architecture](../../skills/coding/architecture/SKILL.md) | "Provides Architectural decision-making framework.... | architecture, implementation guide... |
| [architecture](../../skills/coding/architecture/SKILL.md) | "Provides Plan or restructure website hierarchy,... | site architecture, architecture... |
| [architecture](../../skills/coding/architecture/SKILL.md) | "Provides Guide for quality focused software architecture.... | software architecture, architecture... |
| [architecture-c4-architecture](../../skills/coding/architecture-c4-architecture/SKILL.md) | "Provides Generate comprehensive C4 architecture... | c4 architecture c4 architecture, architecture... |
| [astro](../../skills/coding/astro/SKILL.md) | "Provides Build content-focused websites with Astro — zero... | astro, frontend... |
| [audit](../../skills/coding/audit/SKILL.md) | "Detects missing zeroization of sensitive data in source... | zeroize audit, security... |
| [auditor](../../skills/coding/auditor/SKILL.md) | "Provides Expert security auditor specializing in... | security auditor, security... |
| [authentication](../../skills/coding/authentication/SKILL.md) | "Provides Identify and exploit authentication and session... | broken authentication, security... |
| [automation](../../skills/coding/automation/SKILL.md) | Provides Browser automation powers web testing, scraping,... | browser automation, test... |
| [automation-demo](../../skills/coding/automation-demo/SKILL.md) | "Demonstrates the skill automation system with pre-commit... | test automation, automation testing... |
| [automator](../../skills/coding/automator/SKILL.md) | Provides Master AI-powered test automation with modern... | test automator, test... |
| [backend](../../skills/coding/backend/SKILL.md) | "Provides Build ASP.NET Core 8+ backend services with EF... | dotnet backend, backend... |
| [backend-patterns](../../skills/coding/backend-patterns/SKILL.md) | "Provides Master C#/.NET patterns for building... | dotnet backend patterns, backend... |
| [backend-patterns](../../skills/coding/backend-patterns/SKILL.md) | "Provides Comprehensive guidance for building scalable,... | nodejs backend patterns, backend... |
| [best-practices](../../skills/coding/best-practices/SKILL.md) | Provides Next.js App Router principles. Server Components,... | nextjs best practices, frontend... |
| [best-practices](../../skills/coding/best-practices/SKILL.md) | "Provides Node.js development principles and... | nodejs best practices, architecture... |
| [bluebook-builder](../../skills/coding/bluebook-builder/SKILL.md) | "Provides Build a minimal but real security policy for... | security bluebook builder, security... |
| [bob-craft](../../skills/coding/bob-craft/SKILL.md) | "Provides use when performing code review, writing or... | uncle bob craft, code... |
| [browser-automation](../../skills/coding/browser-automation/SKILL.md) | "Provides AI-powered browser automation — navigate sites,... | skyvern browser automation, browser... |
| [brutalist-ui](../../skills/coding/brutalist-ui/SKILL.md) | Provides use when creating raw industrial or tactical... | industrial brutalist ui, frontend... |
| [bugs](../../skills/coding/bugs/SKILL.md) | "Provides Find bugs, security vulnerabilities, and code... | find bugs, code... |
| [by-design](../../skills/coding/by-design/SKILL.md) | "Provides use when building apps that collect user data.... | privacy by design, security... |
| [checklist](../../skills/coding/checklist/SKILL.md) | "Provides Provide a comprehensive checklist for planning,... | pentest checklist, security... |
| [claude-skill](../../skills/coding/claude-skill/SKILL.md) | "Implements web fuzzing with ffuf patterns for software... | ffuf claude skill, security... |
| [claude-skill](../../skills/coding/claude-skill/SKILL.md) | "Provides Secure environment variable management ensuring... | varlock claude skill, security... |
| [cleanup-tech-debt](../../skills/coding/cleanup-tech-debt/SKILL.md) | "Provides You are a technical debt expert specializing in... | codebase cleanup tech debt, code... |
| [cloud-api](../../skills/coding/cloud-api/SKILL.md) | "Provides Integracao com WhatsApp Business Cloud API... | whatsapp cloud api, backend... |
| [code](../../skills/coding/code/SKILL.md) | "Provides Expert C4 Code-level documentation specialist.... | c4 code, architecture... |
| [code](../../skills/coding/code/SKILL.md) | "Implements this skill embodies the principles of patterns... | clean code, code... |
| [code-audit](../../skills/coding/code-audit/SKILL.md) | "Provides Autonomously deep-scan entire codebase... | production code audit, architecture... |
| [code-auditor](../../skills/coding/code-auditor/SKILL.md) | "Provides Audit rapidly generated or AI-produced code for... | vibe code auditor, code... |
| [code-quality-policies](../../skills/coding/code-quality-policies/SKILL.md) | "Provides Establishing policies for maintaining a clean... | code quality, clean code... |
| [code-review](../../skills/coding/code-review/SKILL.md) | "Analyzes code diffs and files to identify bugs, security... | analyzes, code review... |
| [code-review](../../skills/coding/code-review/SKILL.md) | "Provides Human review workflow for AI-generated GitHub... | vibers code review, code... |
| [code-validation](../../skills/coding/code-validation/SKILL.md) | Validates pipeline stages and returns config status strings... | validation, code validation... |
| [commands](../../skills/coding/commands/SKILL.md) | "Provides Provide a comprehensive command reference for... | pentest commands, security... |
| [compliance](../../skills/coding/compliance/SKILL.md) | "Provides Master PCI DSS (Payment Card Industry Data... | pci compliance, security... |
| [compliance-checker](../../skills/coding/compliance-checker/SKILL.md) | "Provides Automated compliance checking against CIS,... | aws compliance checker, security... |
| [compliance-compliance-check](../../skills/coding/compliance-compliance-check/SKILL.md) | "Provides You are a compliance expert specializing in... | security compliance compliance check, security... |
| [component](../../skills/coding/component/SKILL.md) | "Provides Expert C4 Component-level documentation... | c4 component, architecture... |
| [configuration](../../skills/coding/configuration/SKILL.md) | "Provides Configure mutual TLS (mTLS) for zero-trust... | mtls configuration, security... |
| [configuration](../../skills/coding/configuration/SKILL.md) | Provides Static Application Security Testing (SAST) tool... | sast configuration, security... |
| [configuration](../../skills/coding/configuration/SKILL.md) | "Provides Master ShellCheck static analysis configuration... | shellcheck configuration, code... |
| [container](../../skills/coding/container/SKILL.md) | "Implements expert c4 container-level documentation... | c4 container, architecture... |
| [context](../../skills/coding/context/SKILL.md) | "Provides Expert C4 Context-level documentation specialist.... | c4 context, architecture... |
| [context-mapping](../../skills/coding/context-mapping/SKILL.md) | "Provides Map relationships between bounded contexts and... | ddd context mapping, architecture... |
| [convex](../../skills/coding/convex/SKILL.md) | 'Provides Convex reactive backend expert: schema design,... | convex, framework... |
| [conviction-scoring](../../skills/coding/conviction-scoring/SKILL.md) | "Multi-factor conviction scoring engine combining... | combining, conviction scoring... |
| [cve-dependency-management](../../skills/coding/cve-dependency-management/SKILL.md) | "Provides Cybersecurity operations skill for automating... | CVE, dependency management... |
| [dashboard-html-jsp-custom-best-pratices](../../skills/coding/dashboard-html-jsp-custom-best-pratices/SKILL.md) | "Provides this skill should be used when the user asks for... | sankhya dashboard html jsp custom best pratices, code... |
| [data-handling](../../skills/coding/data-handling/SKILL.md) | "Provides Practical implementation guide for GDPR-compliant... | gdpr data handling, security... |
| [data-normalization](../../skills/coding/data-normalization/SKILL.md) | 'Provides Exchange data normalization layer: typed... | data normalization, data-normalization... |
| [database](../../skills/coding/database/SKILL.md) | "Provides Direct REST API access to PubMed. Advanced... | pubmed database, backend... |
| [database](../../skills/coding/database/SKILL.md) | Provides Direct REST API access to UniProt. Protein... | uniprot database, backend... |
| [debugger](../../skills/coding/debugger/SKILL.md) | "Debugging specialist for errors, test failures, and... | debugger, development... |
| [debugging](../../skills/coding/debugging/SKILL.md) | "Provides use when encountering any bug, test failure, or... | systematic debugging, development... |
| [decision-records](../../skills/coding/decision-records/SKILL.md) | "Provides Comprehensive patterns for creating, maintaining,... | architecture decision records, architecture... |
| [design](../../skills/coding/design/SKILL.md) | "Provides You are a frontend designer-engineer, not a... | frontend design, front... |
| [design-principles](../../skills/coding/design-principles/SKILL.md) | "Provides Master REST and GraphQL API design principles to... | api design principles, backend... |
| [design-taste](../../skills/coding/design-taste/SKILL.md) | "Provides use when generating google stitch design.md... | stitch design taste, frontend... |
| [dev-guidelines](../../skills/coding/dev-guidelines/SKILL.md) | "Provides You are a senior backend engineer operating... | backend dev guidelines, backend... |
| [dev-guidelines](../../skills/coding/dev-guidelines/SKILL.md) | "Provides You are a senior frontend engineer operating... | frontend dev guidelines, front... |
| [developer](../../skills/coding/developer/SKILL.md) | "Provides Build React components, implement responsive... | frontend developer, front... |
| [development-feature-development](../../skills/coding/development-feature-development/SKILL.md) | "Provides Orchestrate end-to-end backend feature... | backend development feature development, backend... |
| [directory-attacks](../../skills/coding/directory-attacks/SKILL.md) | "Provides Provide comprehensive techniques for attacking... | active directory attacks, security... |
| [documentation-generator](../../skills/coding/documentation-generator/SKILL.md) | "Provides Generate comprehensive, developer-friendly API... | api documentation generator, backend... |
| [documenter](../../skills/coding/documenter/SKILL.md) | "Provides Master API documentation with OpenAPI 3.1,... | api documenter, backend... |
| [driven-design](../../skills/coding/driven-design/SKILL.md) | "Provides Plan and route Domain-Driven Design work from... | domain driven design, architecture... |
| [ds-ab-testing](../../skills/coding/ds-ab-testing/SKILL.md) | Provides Designs and analyzes A/B tests including... | A/B testing, A/B test... |
| [ds-anomaly-detection](../../skills/coding/ds-anomaly-detection/SKILL.md) | "Detects anomalies and outliers using isolation forests,... | anomaly detection, outlier detection... |
| [ds-association-rules](../../skills/coding/ds-association-rules/SKILL.md) | "Provides Discovers association rules and frequent itemsets... | association rules, market basket... |
| [ds-bayesian-inference](../../skills/coding/ds-bayesian-inference/SKILL.md) | "Applies Bayesian methods for prior selection, posterior... | bayesian inference, bayes... |
| [ds-bias-variance-tradeoff](../../skills/coding/ds-bias-variance-tradeoff/SKILL.md) | "Analyzes bias-variance tradeoff, overfitting,... | bias-variance, overfitting... |
| [ds-categorical-encoding](../../skills/coding/ds-categorical-encoding/SKILL.md) | "Provides Encodes categorical variables using one-hot... | categorical encoding, one-hot encoding... |
| [ds-causal-inference](../../skills/coding/ds-causal-inference/SKILL.md) | Implements causal models, directed acyclic graphs (DAGs),... | causal inference, causality... |
| [ds-classification-metrics](../../skills/coding/ds-classification-metrics/SKILL.md) | "Evaluates classification models using precision, recall,... | classification metrics, precision... |
| [ds-clustering](../../skills/coding/ds-clustering/SKILL.md) | "Implements clustering algorithms including K-means,... | clustering, k-means... |
| [ds-community-detection](../../skills/coding/ds-community-detection/SKILL.md) | "Detects communities and clusters in graphs using... | community detection, graph clustering... |
| [ds-confidence-intervals](../../skills/coding/ds-confidence-intervals/SKILL.md) | "Provides Constructs confidence intervals using bootstrap,... | confidence intervals, bootstrap... |
| [ds-correlation-analysis](../../skills/coding/ds-correlation-analysis/SKILL.md) | "Analyzes correlation, covariance, and multivariate... | correlation analysis, covariance... |
| [ds-cross-validation](../../skills/coding/ds-cross-validation/SKILL.md) | "Implements k-fold cross-validation, stratified... | cross-validation, k-fold... |
| [ds-data-collection](../../skills/coding/ds-data-collection/SKILL.md) | "Implements data gathering strategies including APIs, web... | data collection, web scraping... |
| [ds-data-ingestion](../../skills/coding/ds-data-ingestion/SKILL.md) | "Provides Designs and implements ETL pipelines, streaming... | ETL pipeline, data ingestion... |
| [ds-data-privacy](../../skills/coding/ds-data-privacy/SKILL.md) | "Applies privacy-preserving techniques including... | data privacy, anonymization... |
| [ds-data-profiling](../../skills/coding/ds-data-profiling/SKILL.md) | Provides Extracts data profiles, schemas, metadata, and... | data profiling, metadata extraction... |
| [ds-data-quality](../../skills/coding/ds-data-quality/SKILL.md) | "Implements data validation, cleaning, outlier detection,... | data validation, data cleaning... |
| [ds-data-versioning](../../skills/coding/ds-data-versioning/SKILL.md) | "Implements data versioning, lineage tracking, provenance... | data versioning, data lineage... |
| [ds-data-visualization](../../skills/coding/ds-data-visualization/SKILL.md) | "Creates effective visualizations including plots, charts,... | data visualization, plotting... |
| [ds-dimensionality-reduction](../../skills/coding/ds-dimensionality-reduction/SKILL.md) | "Provides Reduces data dimensionality using PCA, t-SNE,... | dimensionality reduction, PCA... |
| [ds-distribution-fitting](../../skills/coding/ds-distribution-fitting/SKILL.md) | "Provides Fits statistical distributions to data using... | distribution fitting, goodness-of-fit... |
| [ds-eda](../../skills/coding/ds-eda/SKILL.md) | "Provides Performs exploratory data analysis using summary... | exploratory data analysis, EDA... |
| [ds-ensemble-methods](../../skills/coding/ds-ensemble-methods/SKILL.md) | "Provides Combines multiple models using bagging, boosting,... | ensemble methods, bagging... |
| [ds-experimental-design](../../skills/coding/ds-experimental-design/SKILL.md) | "Provides Designs experiments using design of experiments... | experimental design, DOE... |
| [ds-explainability](../../skills/coding/ds-explainability/SKILL.md) | "Implements explainability and interpretability techniques... | explainability, interpretability... |
| [ds-feature-engineering](../../skills/coding/ds-feature-engineering/SKILL.md) | "Creates and transforms features including polynomial... | feature engineering, feature creation... |
| [ds-feature-interaction](../../skills/coding/ds-feature-interaction/SKILL.md) | "Provides Discovers and engineers feature interactions... | feature interaction, interaction terms... |
| [ds-feature-scaling-normalization](../../skills/coding/ds-feature-scaling-normalization/SKILL.md) | "Provides Scales and normalizes features using... | feature scaling, normalization... |
| [ds-feature-selection](../../skills/coding/ds-feature-selection/SKILL.md) | "Selects relevant features using univariate selection,... | feature selection, feature importance... |
| [ds-hyperparameter-tuning](../../skills/coding/ds-hyperparameter-tuning/SKILL.md) | "Optimizes hyperparameters using grid search, random... | hyperparameter tuning, grid search... |
| [ds-hypothesis-testing](../../skills/coding/ds-hypothesis-testing/SKILL.md) | Implements hypothesis testing including t-tests, chi-square... | hypothesis testing, t-test... |
| [ds-instrumental-variables](../../skills/coding/ds-instrumental-variables/SKILL.md) | "Provides Uses instrumental variables (IV), two-stage least... | instrumental variables, IV... |
| [ds-intervention-analysis](../../skills/coding/ds-intervention-analysis/SKILL.md) | "Provides Estimates treatment effects, conditional average... | treatment effects, intervention analysis... |
| [ds-kernel-density](../../skills/coding/ds-kernel-density/SKILL.md) | "Implements kernel density estimation, non-parametric... | kernel density estimation, KDE... |
| [ds-linear-regression](../../skills/coding/ds-linear-regression/SKILL.md) | "Implements linear regression including OLS, ridge... | linear regression, OLS... |
| [ds-logistic-regression](../../skills/coding/ds-logistic-regression/SKILL.md) | "Implements logistic regression for binary and multinomial... | logistic regression, classification... |
| [ds-maximum-likelihood](../../skills/coding/ds-maximum-likelihood/SKILL.md) | Implements maximum likelihood estimation, likelihood... | maximum likelihood, MLE... |
| [ds-metrics-and-kpis](../../skills/coding/ds-metrics-and-kpis/SKILL.md) | "Defines, selects, and monitors key performance indicators... | metrics, KPI... |
| [ds-missing-data](../../skills/coding/ds-missing-data/SKILL.md) | "Handles missing data using imputation strategies, deletion... | missing data, imputation... |
| [ds-model-fairness](../../skills/coding/ds-model-fairness/SKILL.md) | "Evaluates and mitigates fairness issues including bias... | model fairness, fairness metrics... |
| [ds-model-interpretation](../../skills/coding/ds-model-interpretation/SKILL.md) | "Provides Interprets models using SHAP values, LIME,... | model interpretation, SHAP... |
| [ds-model-robustness](../../skills/coding/ds-model-robustness/SKILL.md) | Improves model robustness including adversarial robustness,... | model robustness, adversarial robustness... |
| [ds-model-selection](../../skills/coding/ds-model-selection/SKILL.md) | "Provides Compares and selects models using AIC, BIC,... | model selection, AIC... |
| [ds-monte-carlo](../../skills/coding/ds-monte-carlo/SKILL.md) | "Implements Monte Carlo sampling, simulation methods, and... | monte carlo, sampling... |
| [ds-neural-networks](../../skills/coding/ds-neural-networks/SKILL.md) | "Implements deep neural networks, backpropagation,... | neural networks, deep learning... |
| [ds-observational-studies](../../skills/coding/ds-observational-studies/SKILL.md) | "Analyzes observational data using matching methods,... | observational studies, propensity score... |
| [ds-online-experiments](../../skills/coding/ds-online-experiments/SKILL.md) | "Implements multi-armed bandits, contextual bandits,... | multi-armed bandits, bandits... |
| [ds-privacy-ml](../../skills/coding/ds-privacy-ml/SKILL.md) | "Implements privacy-preserving machine learning including... | privacy machine learning, differential privacy... |
| [ds-randomized-experiments](../../skills/coding/ds-randomized-experiments/SKILL.md) | "Provides Designs and analyzes randomized controlled trials... | randomized experiments, RCT... |
| [ds-regression-evaluation](../../skills/coding/ds-regression-evaluation/SKILL.md) | "Evaluates regression models using MSE, RMSE, MAE, MAPE,... | regression evaluation, MSE... |
| [ds-reproducible-research](../../skills/coding/ds-reproducible-research/SKILL.md) | "Implements reproducible research practices including code... | reproducible research, reproducibility... |
| [ds-statistical-power](../../skills/coding/ds-statistical-power/SKILL.md) | "Analyzes statistical power, sample size determination,... | statistical power, power analysis... |
| [ds-support-vector-machines](../../skills/coding/ds-support-vector-machines/SKILL.md) | "Implements support vector machines (SVM) with kernel... | support vector machines, SVM... |
| [ds-synthetic-control](../../skills/coding/ds-synthetic-control/SKILL.md) | "Implements synthetic control methods,... | synthetic control, difference-in-differences... |
| [ds-time-series-forecasting](../../skills/coding/ds-time-series-forecasting/SKILL.md) | "Implements ARIMA, exponential smoothing, state-space... | time series forecasting, ARIMA... |
| [ds-topic-modeling](../../skills/coding/ds-topic-modeling/SKILL.md) | "Implements topic modeling using Latent Dirichlet... | topic modeling, LDA... |
| [ds-tree-methods](../../skills/coding/ds-tree-methods/SKILL.md) | "Implements decision trees, random forests, gradient... | decision trees, random forest... |
| [e2e-testing](../../skills/coding/e2e-testing/SKILL.md) | "Provides AI-powered E2E web testing — eyes and hands for... | awt e2e testing, test... |
| [end-visual-design](../../skills/coding/end-visual-design/SKILL.md) | "Provides use when designing expensive agency-grade... | high end visual design, frontend... |
| [engine-cpp-pro](../../skills/coding/engine-cpp-pro/SKILL.md) | "Provides Expert guide for Unreal Engine 5.x C++... | unreal engine cpp pro, code... |
| [engineer](../../skills/coding/engineer/SKILL.md) | "Provides Expert reverse engineer specializing in binary... | reverse engineer, security... |
| [escalation-methods](../../skills/coding/escalation-methods/SKILL.md) | "Provides Provide comprehensive techniques for escalating... | privilege escalation methods, security... |
| [event-bus](../../skills/coding/event-bus/SKILL.md) | "Async pub/sub event bus with typed events, mixed... | async, event bus... |
| [event-driven-architecture](../../skills/coding/event-driven-architecture/SKILL.md) | "'Event-driven architecture for real-time trading systems:... | event driven architecture, event-driven... |
| [existing-projects](../../skills/coding/existing-projects/SKILL.md) | "Provides use when upgrading existing websites or apps by... | redesign existing projects, frontend... |
| [experience](../../skills/coding/experience/SKILL.md) | "Provides Expert in building immersive scroll-driven... | scroll experience, front... |
| [expert](../../skills/coding/expert/SKILL.md) | "Provides Advanced .faf (Foundational AI-context Format)... | faf expert, coding... |
| [expert](../../skills/coding/expert/SKILL.md) | "Provides Senior Laravel Engineer role for... | laravel expert, framework... |
| [expert](../../skills/coding/expert/SKILL.md) | "Provides You are an expert in Nest.js with deep knowledge... | nestjs expert, framework... |
| [expert](../../skills/coding/expert/SKILL.md) | "Provides TypeScript and JavaScript expert with deep... | typescript expert, framework... |
| [express-wrapper](../../skills/coding/express-wrapper/SKILL.md) | "Provides Wrapper oficial de M2MCent (Node.js) para... | x402 express wrapper, backend... |
| [extension-developer](../../skills/coding/extension-developer/SKILL.md) | "Provides Expert in building Chrome Extensions using... | chrome extension developer, front... |
| [fastapi-patterns](../../skills/coding/fastapi-patterns/SKILL.md) | "FastAPI application structure with typed error hierarchy,... | application, cloud infrastructure... |
| [fixing](../../skills/coding/fixing/SKILL.md) | "Provides Systematically identify and fix all failing tests... | test fixing, development... |
| [forensics](../../skills/coding/forensics/SKILL.md) | "Provides Comprehensive techniques for acquiring,... | memory forensics, security... |
| [framework](../../skills/coding/framework/SKILL.md) | "Provides ⚠️ AUTHORIZED USE ONLY > This skill is for... | metasploit framework, security... |
| [fullstack](../../skills/coding/fullstack/SKILL.md) | "Provides Build end-to-end type-safe APIs with tRPC —... | trpc fullstack, framework... |
| [fuzzing-bug-bounty](../../skills/coding/fuzzing-bug-bounty/SKILL.md) | "Provides Provide comprehensive techniques for testing... | api fuzzing bug bounty, backend... |
| [gateway](../../skills/coding/gateway/SKILL.md) | "Provides REST API gateway for ComfyUI servers. Workflow... | comfyui gateway, backend... |
| [git-advanced](../../skills/coding/git-advanced/SKILL.md) | "Provides Advanced Git operations including rebasing,... | git rebase, git cherry-pick... |
| [git-branching-strategies](../../skills/coding/git-branching-strategies/SKILL.md) | "Git branching models including Git Flow, GitHub Flow,... | git branching strategies, git repository... |
| [github-repo-commander](../../skills/coding/github-repo-commander/SKILL.md) | "Provides 7-stage super workflow for GitHub repo audit,... | openclaw github repo commander, development... |
| [graphql](../../skills/coding/graphql/SKILL.md) | Provides GraphQL gives clients exactly the data they need -... | graphql, backend... |
| [hacking-methodology](../../skills/coding/hacking-methodology/SKILL.md) | "Provides Master the complete penetration testing lifecycle... | ethical hacking methodology, security... |
| [hono](../../skills/coding/hono/SKILL.md) | "Provides Build ultra-fast web APIs and full-stack apps... | hono, backend... |
| [html-injection](../../skills/coding/html-injection/SKILL.md) | "Provides Execute comprehensive client-side injection... | xss html injection, security... |
| [hunter](../../skills/coding/hunter/SKILL.md) | "Provides Systematically finds and fixes bugs using proven... | bug hunter, development... |
| [iam-best-practices](../../skills/coding/iam-best-practices/SKILL.md) | Provides IAM policy review, hardening, and least privilege... | aws iam best practices, security... |
| [implementation](../../skills/coding/implementation/SKILL.md) | "Provides Implement Command Query Responsibility... | cqrs implementation, architecture... |
| [implementation-patterns](../../skills/coding/implementation-patterns/SKILL.md) | "Provides Build secure, scalable authentication and... | auth implementation patterns, security... |
| [injection-testing](../../skills/coding/injection-testing/SKILL.md) | Provides Identify and exploit HTML injection... | html injection testing, security... |
| [injection-testing](../../skills/coding/injection-testing/SKILL.md) | Provides Execute comprehensive SQL injection vulnerability... | sql injection testing, security... |
| [java](../../skills/coding/java/SKILL.md) | Provides Scaffold, write, debug, and enhance... | playwright java, test... |
| [juice-shop](../../skills/coding/juice-shop/SKILL.md) | "'OWASP Juice Shop guide: Web application security testing... | application, guide... |
| [kaizen](../../skills/coding/kaizen/SKILL.md) | "Provides Guide for continuous improvement, error proofing,... | kaizen, code... |
| [leiloeiros](../../skills/coding/leiloeiros/SKILL.md) | "Provides Coleta e consulta dados de leiloeiros oficiais de... | junta leiloeiros, backend... |
| [load-testing](../../skills/coding/load-testing/SKILL.md) | "Provides Comprehensive k6 load testing skill for API,... | k6 load testing, testing... |
| [management](../../skills/coding/management/SKILL.md) | Provides Secure secrets management practices for CI/CD... | secrets management, security... |
| [management-deps-audit](../../skills/coding/management-deps-audit/SKILL.md) | "Provides You are a dependency security expert specializing... | dependency management deps audit, security... |
| [markdown-best-practices](../../skills/coding/markdown-best-practices/SKILL.md) | "Provides Markdown best practices for OpenCode skills -... | markdown best practices, markdown-best-practices... |
| [metadata](../../skills/coding/metadata/SKILL.md) | Provides Audit and fix HTML metadata including page titles,... | fixing metadata, front... |
| [mitigation-mapping](../../skills/coding/mitigation-mapping/SKILL.md) | "Provides Map identified threats to appropriate security... | threat mitigation mapping, security... |
| [mobile-development-component-scaffold](../../skills/coding/mobile-development-component-scaffold/SKILL.md) | "Provides You are a React component architecture expert... | frontend mobile development component scaffold, app... |
| [modeling-expert](../../skills/coding/modeling-expert/SKILL.md) | "Provides Expert in threat modeling methodologies, security... | threat modeling expert, security... |
| [motion-performance](../../skills/coding/motion-performance/SKILL.md) | Provides Audit and fix animation performance issues... | fixing motion performance, front... |
| [omega](../../skills/coding/omega/SKILL.md) | "Provides CISO operacional enterprise para gestao total de... | cred omega, security... |
| [orchestration](../../skills/coding/orchestration/SKILL.md) | "Provides Patterns for managing distributed transactions... | saga orchestration, architecture... |
| [orchestrator](../../skills/coding/orchestrator/SKILL.md) | "Provides Master TDD orchestrator specializing in... | tdd orchestrator, testing... |
| [output-enforcement](../../skills/coding/output-enforcement/SKILL.md) | "Provides use when a task requires exhaustive unabridged... | full output enforcement, frontend... |
| [page-generator](../../skills/coding/page-generator/SKILL.md) | "Generates high-converting Next.js/React landing pages with... | landing page generator, front... |
| [path-traversal](../../skills/coding/path-traversal/SKILL.md) | "Provides Identify and exploit file path traversal... | file path traversal, security... |
| [patterns](../../skills/coding/patterns/SKILL.md) | "Provides API design principles and decision-making. REST... | api patterns, backend... |
| [patterns](../../skills/coding/patterns/SKILL.md) | Provides Master proven backend architecture patterns... | architecture patterns, architecture... |
| [patterns](../../skills/coding/patterns/SKILL.md) | Provides Master microservices architecture patterns... | microservices patterns, architecture... |
| [patterns](../../skills/coding/patterns/SKILL.md) | "Provides Build read models and projections from event... | projection patterns, architecture... |
| [patterns](../../skills/coding/patterns/SKILL.md) | "Provides Modern React patterns and principles. Hooks,... | react patterns, frontend... |
| [patterns](../../skills/coding/patterns/SKILL.md) | "Provides Tailwind CSS v4 principles. CSS-first... | tailwind patterns, frontend... |
| [patterns](../../skills/coding/patterns/SKILL.md) | "Provides Jest testing patterns, factory functions, mocking... | testing patterns, testing... |
| [penetration-testing](../../skills/coding/penetration-testing/SKILL.md) | Provides Conduct comprehensive security assessments of SMTP... | smtp penetration testing, security... |
| [penetration-testing](../../skills/coding/penetration-testing/SKILL.md) | Provides Conduct comprehensive SSH security assessments... | ssh penetration testing, security... |
| [penetration-testing](../../skills/coding/penetration-testing/SKILL.md) | Provides Assess WordPress installations for common... | wordpress penetration testing, security... |
| [perf-review](../../skills/coding/perf-review/SKILL.md) | "Implements django performance code review. use when asked... | django perf review, backend... |
| [performance-optimization](../../skills/coding/performance-optimization/SKILL.md) | Provides Optimize website and web application performance... | web performance optimization, front... |
| [playwright](../../skills/coding/playwright/SKILL.md) | Provides Expert capability for robust, stealthy, and... | go playwright, test... |
| [portfolio](../../skills/coding/portfolio/SKILL.md) | "Provides Expert in building portfolios that actually land... | interactive portfolio, front... |
| [privilege-escalation](../../skills/coding/privilege-escalation/SKILL.md) | "Provides Execute systematic privilege escalation... | linux privilege escalation, security... |
| [privilege-escalation](../../skills/coding/privilege-escalation/SKILL.md) | "Provides Provide systematic methodologies for discovering... | windows privilege escalation, security... |
| [pro](../../skills/coding/pro/SKILL.md) | "Provides Write efficient C code with proper memory... | c pro, code... |
| [pro](../../skills/coding/pro/SKILL.md) | "Provides Write idiomatic C++ code with modern features,... | cpp pro, code... |
| [pro](../../skills/coding/pro/SKILL.md) | "Provides Write modern C# code with advanced features like... | csharp pro, code... |
| [pro](../../skills/coding/pro/SKILL.md) | "Provides Master Django 5.x with async views, DRF, Celery,... | django pro, framework... |
| [pro](../../skills/coding/pro/SKILL.md) | "Provides Write idiomatic Elixir code with OTP patterns,... | elixir pro, code... |
| [pro](../../skills/coding/pro/SKILL.md) | "Provides Build high-performance async APIs with FastAPI,... | fastapi pro, framework... |
| [pro](../../skills/coding/pro/SKILL.md) | "Provides Master Go 1.21+ with modern patterns, advanced... | golang pro, code... |
| [pro](../../skills/coding/pro/SKILL.md) | "Provides Expert Haskell engineer specializing in advanced... | haskell pro, code... |
| [pro](../../skills/coding/pro/SKILL.md) | "Provides Master Java 21+ with modern features like virtual... | java pro, code... |
| [pro](../../skills/coding/pro/SKILL.md) | "Provides Master modern JavaScript with ES6+, async... | javascript pro, code... |
| [pro](../../skills/coding/pro/SKILL.md) | "Provides Master Julia 1.10+ with modern features,... | julia pro, code... |
| [pro](../../skills/coding/pro/SKILL.md) | "Write idiomatic PHP code with generators, iterators, SPL... | php pro, code... |
| [pro](../../skills/coding/pro/SKILL.md) | "Provides Master Python 3.12+ with modern features, async... | python pro, code... |
| [pro](../../skills/coding/pro/SKILL.md) | "Provides Write idiomatic Ruby code with metaprogramming,... | ruby pro, code... |
| [pro](../../skills/coding/pro/SKILL.md) | "Provides Master Rust 1.75+ with modern async patterns,... | rust pro, code... |
| [pro](../../skills/coding/pro/SKILL.md) | Provides Master enterprise-grade Scala development with... | scala pro, code... |
| [pro](../../skills/coding/pro/SKILL.md) | "Provides Master TypeScript with advanced types, generics,... | typescript pro, code... |
| [project-parser](../../skills/coding/project-parser/SKILL.md) | "Provides Searches and explores Burp Suite project files... | burpsuite project parser, security... |
| [pydantic-config](../../skills/coding/pydantic-config/SKILL.md) | "Pydantic-based configuration management with frozen... | configuration, management... |
| [pydantic-models](../../skills/coding/pydantic-models/SKILL.md) | "'Pydantic frozen data models for trading: enums, annotated... | enums, frozen... |
| [python-testing](../../skills/coding/python-testing/SKILL.md) | "Provides Comprehensive testing approaches for Temporal... | temporal python testing, testing... |
| [query-expert](../../skills/coding/query-expert/SKILL.md) | "Provides Expert in TanStack Query (React Query) —... | tanstack query expert, framework... |
| [reader-testing](../../skills/coding/reader-testing/SKILL.md) | "Provides Practical guide to testing web applications with... | screen reader testing, testing... |
| [reconnaissance](../../skills/coding/reconnaissance/SKILL.md) | "Provides Provide systematic methodologies for leveraging... | shodan reconnaissance, security... |
| [refactoring-refactor-clean](../../skills/coding/refactoring-refactor-clean/SKILL.md) | Provides You are a code refactoring expert specializing in... | code refactoring refactor clean, code... |
| [requirement-extraction](../../skills/coding/requirement-extraction/SKILL.md) | "Provides Derive security requirements from threat models... | security requirement extraction, security... |
| [reverse-engineering](../../skills/coding/reverse-engineering/SKILL.md) | "Provides Comprehensive techniques for capturing,... | protocol reverse engineering, security... |
| [reversing-techniques](../../skills/coding/reversing-techniques/SKILL.md) | 'Provides AUTHORIZED USE ONLY: This skill contains dual-use... | anti reversing techniques, security... |
| [review](../../skills/coding/review/SKILL.md) | "Provides Master software architect specializing in modern... | architect review, architecture... |
| [review](../../skills/coding/review/SKILL.md) | "Provides Professional code review with auto CHANGELOG... | codex review, code... |
| [review](../../skills/coding/review/SKILL.md) | "Implements security-focused code review for prs, commits,... | differential review, security... |
| [review](../../skills/coding/review/SKILL.md) | "Implements verify fix commits address audit findings... | fix review, code... |
| [review-checklist](../../skills/coding/review-checklist/SKILL.md) | "Provides Comprehensive checklist for conducting thorough... | code review checklist, code... |
| [review-full-review](../../skills/coding/review-full-review/SKILL.md) | "Implements use when working with comprehensive review full... | comprehensive review full review, code... |
| [review-pr-enhance](../../skills/coding/review-pr-enhance/SKILL.md) | "Provides Generate structured PR descriptions from diffs,... | comprehensive review pr enhance, code... |
| [router-py](../../skills/coding/router-py/SKILL.md) | "Provides Create FastAPI routers following established... | fastapi router py, backend... |
| [rule-creator](../../skills/coding/rule-creator/SKILL.md) | "Creates custom Semgrep rules for detecting security... | semgrep rule creator, security... |
| [rule-variant-creator](../../skills/coding/rule-variant-creator/SKILL.md) | "Creates language variants of existing Semgrep rules. Use... | semgrep rule variant creator, security... |
| [scanner](../../skills/coding/scanner/SKILL.md) | "Provides Advanced vulnerability analysis principles. OWASP... | vulnerability scanner, security... |
| [scanning-security-dependencies](../../skills/coding/scanning-security-dependencies/SKILL.md) | "Provides You are a security expert specializing in... | security scanning security dependencies, security... |
| [scanning-security-hardening](../../skills/coding/scanning-security-hardening/SKILL.md) | "Provides Coordinate multi-layer security scanning and... | security scanning security hardening, security... |
| [scanning-security-sast](../../skills/coding/scanning-security-sast/SKILL.md) | "Static Application Security Testing (SAST) for code... | security scanning security sast, security... |
| [sdk](../../skills/coding/sdk/SKILL.md) | "Provides Build applications that programmatically interact... | copilot sdk, backend... |
| [secrets-rotation](../../skills/coding/secrets-rotation/SKILL.md) | "Provides Automate AWS secrets rotation for RDS, API keys,... | aws secrets rotation, security... |
| [secure-release-pipeline](../../skills/coding/secure-release-pipeline/SKILL.md) | Implements comprehensive secure release pipeline with CVE... | secure release, CVE scanning... |
| [security](../../skills/coding/security/SKILL.md) | "Provides Master smart contract security best practices,... | solidity security, security... |
| [security-audit](../../skills/coding/security-audit/SKILL.md) | "Provides Comprehensive AWS security posture assessment... | aws security audit, security... |
| [security-audit](../../skills/coding/security-audit/SKILL.md) | "Provides Security auditor for Laravel applications.... | laravel security audit, security... |
| [security-audit-007](../../skills/coding/security-audit-007/SKILL.md) | "Provides Security audit, hardening, threat modeling... | 007, security... |
| [security-best-practices](../../skills/coding/security-best-practices/SKILL.md) | Provides Implement secure API design patterns including... | api security best practices, backend... |
| [security-coder](../../skills/coding/security-coder/SKILL.md) | Provides Expert in secure backend coding practices... | backend security coder, backend... |
| [security-coder](../../skills/coding/security-coder/SKILL.md) | "Provides Expert in secure frontend coding practices... | frontend security coder, security... |
| [security-review](../../skills/coding/security-review/SKILL.md) | "Provides Find exploitable vulnerabilities in GitHub... | gha security review, security... |
| [security-review](../../skills/coding/security-review/SKILL.md) | "Security-focused code review identifying vulnerabilities... | identifying, security review... |
| [semver-automation](../../skills/coding/semver-automation/SKILL.md) | "Provides Automating semantic versioning in Git... | semantic versioning, semver... |
| [shadcn](../../skills/coding/shadcn/SKILL.md) | "Manages shadcn/ui components and projects, providing... | shadcn, framework... |
| [skill](../../skills/coding/skill/SKILL.md) | 'Provides IMPORTANT - Path Resolution: This skill can be... | playwright skill, test... |
| [skill](../../skills/coding/skill/SKILL.md) | "Implements pairwise test generation patterns for software... | pypict skill, testing... |
| [skills](../../skills/coding/skills/SKILL.md) | "Provides Expert security auditor for AI Skills and... | audit skills, security... |
| [sourcing-architect](../../skills/coding/sourcing-architect/SKILL.md) | "Provides Expert in event sourcing, CQRS, and event-driven... | event sourcing architect, architecture... |
| [specialist](../../skills/coding/specialist/SKILL.md) | "Provides BullMQ expert for Redis-backed job queues,... | bullmq specialist, framework... |
| [store-design](../../skills/coding/store-design/SKILL.md) | "Provides Design and implement event stores for... | event store design, architecture... |
| [store-ts](../../skills/coding/store-ts/SKILL.md) | "Provides Create Zustand stores following established... | zustand store ts, frontend... |
| [strategic-design](../../skills/coding/strategic-design/SKILL.md) | "Provides Design DDD strategic artifacts including... | ddd strategic design, architecture... |
| [strategies](../../skills/coding/strategies/SKILL.md) | "Provides Transform debugging from frustrating guesswork... | debugging strategies, development... |
| [strategy-base](../../skills/coding/strategy-base/SKILL.md) | "Abstract base strategy pattern with initialization guards,... | abstract, initialization... |
| [suite-testing](../../skills/coding/suite-testing/SKILL.md) | Provides Execute comprehensive web application security... | burp suite testing, security... |
| [sveltekit](../../skills/coding/sveltekit/SKILL.md) | "Provides Build full-stack web applications with SvelteKit... | sveltekit, frontend... |
| [tactical-patterns](../../skills/coding/tactical-patterns/SKILL.md) | "Provides Apply DDD tactical patterns in code using... | ddd tactical patterns, architecture... |
| [taste](../../skills/coding/taste/SKILL.md) | "Provides use when generating elite gsap-heavy frontend... | gpt taste, frontend... |
| [taste-frontend](../../skills/coding/taste-frontend/SKILL.md) | "Provides use when building high-agency frontend interfaces... | design taste frontend, frontend... |
| [team-tactics](../../skills/coding/team-tactics/SKILL.md) | "Provides Red team tactics principles based on MITRE... | red team tactics, security... |
| [team-tools](../../skills/coding/team-tools/SKILL.md) | "Provides Implement proven methodologies and tool workflows... | red team tools, security... |
| [telegram](../../skills/coding/telegram/SKILL.md) | "Provides Integracao completa com Telegram Bot API. Setup... | telegram, backend... |
| [templates](../../skills/coding/templates/SKILL.md) | "Provides Create production-ready FastAPI projects with... | fastapi templates, app... |
| [templates](../../skills/coding/templates/SKILL.md) | "Provides Project scaffolding templates for new... | templates, app... |
| [test-driven-development](../../skills/coding/test-driven-development/SKILL.md) | "Test-Driven Development (TDD) and Behavior-Driven... | behavior-driven, patterns... |
| [testing](../../skills/coding/testing/SKILL.md) | Provides Provide systematic methodologies for identifying... | idor testing, security... |
| [testing](../../skills/coding/testing/SKILL.md) | Provides To test local web applications, write native... | webapp testing, test... |
| [testing-observability-api-mock](../../skills/coding/testing-observability-api-mock/SKILL.md) | Provides You are an API mocking expert specializing in... | api testing observability api mock, backend... |
| [testing-patterns](../../skills/coding/testing-patterns/SKILL.md) | "Provides Master Bash Automated Testing System (Bats) for... | bats testing patterns, testing... |
| [testing-patterns](../../skills/coding/testing-patterns/SKILL.md) | Provides Build reliable, fast, and maintainable end-to-end... | e2e testing patterns, test... |
| [testing-test-generate](../../skills/coding/testing-test-generate/SKILL.md) | "Provides Generate comprehensive, maintainable unit tests... | unit testing test generate, testing... |
| [time-analysis](../../skills/coding/time-analysis/SKILL.md) | "Provides Analyze cryptographic code to detect operations... | constant time analysis, security... |
| [to-code-compliance](../../skills/coding/to-code-compliance/SKILL.md) | "Provides Verifies code implements exactly what... | spec to code compliance, code... |
| [tools](../../skills/coding/tools/SKILL.md) | "Provides Master essential security scanning tools for... | scanning tools, security... |
| [tree-construction](../../skills/coding/tree-construction/SKILL.md) | "Provides Build comprehensive attack trees to visualize... | attack tree construction, security... |
| [typescript-typescript-scaffold](../../skills/coding/typescript-typescript-scaffold/SKILL.md) | "Provides You are a TypeScript project architecture expert... | javascript typescript typescript scaffold, app... |
| [ui](../../skills/coding/ui/SKILL.md) | "Provides use when creating clean editorial interfaces with... | minimalist ui, frontend... |
| [ui-verification](../../skills/coding/ui-verification/SKILL.md) | Provides Automated end-to-end UI testing and verification... | android ui verification, test... |
| [uploads](../../skills/coding/uploads/SKILL.md) | "Provides Expert at handling file uploads and cloud... | file uploads, security... |
| [ux-pro-max](../../skills/coding/ux-pro-max/SKILL.md) | "Provides Comprehensive design guide for web and mobile... | ui ux pro max, front... |
| [validation-expert](../../skills/coding/validation-expert/SKILL.md) | "Provides Expert in Zod — TypeScript-first schema... | zod validation expert, framework... |
| [varlock](../../skills/coding/varlock/SKILL.md) | "Provides Secure-by-default environment variable management... | varlock, security... |
| [web-app](../../skills/coding/web-app/SKILL.md) | "Provides Build Progressive Web Apps (PWAs) with offline... | progressive web app, front... |
| [web-fuzzing](../../skills/coding/web-fuzzing/SKILL.md) | "Provides Expert guidance for ffuf web fuzzing during... | ffuf web fuzzing, security... |
| [web-vulnerabilities](../../skills/coding/web-vulnerabilities/SKILL.md) | "Provides Provide a comprehensive, structured reference for... | top web vulnerabilities, security... |
| [websocket-manager](../../skills/coding/websocket-manager/SKILL.md) | "WebSocket connection manager with state machine... | connection, machine... |
| [widget](../../skills/coding/widget/SKILL.md) | "Provides Build a real-time support chat system with a... | chat widget, front... |
| [workers-expert](../../skills/coding/workers-expert/SKILL.md) | "Provides Expert in Cloudflare Workers and the Edge... | cloudflare workers expert, framework... |
| [workflow](../../skills/coding/workflow/SKILL.md) | "Provides Test-Driven Development workflow principles.... | tdd workflow, testing... |
| [workflows-tdd-cycle](../../skills/coding/workflows-tdd-cycle/SKILL.md) | "Implements use when working with tdd workflows tdd cycle... | tdd workflows tdd cycle, testing... |
| [workflows-tdd-green](../../skills/coding/workflows-tdd-green/SKILL.md) | "Provides Implement the minimal code needed to make failing... | tdd workflows tdd green, testing... |
| [workflows-tdd-red](../../skills/coding/workflows-tdd-red/SKILL.md) | "Provides Generate failing tests for the TDD red phase to... | tdd workflows tdd red, testing... |
| [workflows-tdd-refactor](../../skills/coding/workflows-tdd-refactor/SKILL.md) | "Implements use when working with tdd workflows tdd... | tdd workflows tdd refactor, testing... |


### Programming (789 skills)

| Skill Name | Description | Triggers |
|---|---|---|
| [3d-integration](../../skills/programming/3d-integration/SKILL.md) | "Provides use when adding interactive 3d scenes from... | spline 3d integration, web... |
| [a11y](../../skills/programming/a11y/SKILL.md) | "Provides Audit a StyleSeed-based component or page for... | ui a11y, design... |
| [abl-v10-learning](../../skills/programming/abl-v10-learning/SKILL.md) | "Reference guide for Progress OpenEdge ABL 10.1A (2005) —... | abl, abl programming... |
| [abl-v12-learning](../../skills/programming/abl-v12-learning/SKILL.md) | "Reference guide for Progress OpenEdge ABL 12.7 (2023) —... | abl v12, openedge 12... |
| [accounting-setup](../../skills/programming/accounting-setup/SKILL.md) | 'Provides Expert guide for configuring Odoo Accounting:... | odoo accounting setup, business... |
| [actions-auditor](../../skills/programming/actions-auditor/SKILL.md) | Audits GitHub Actions workflows for security... | agentic actions auditor, ai... |
| [activity-planner](../../skills/programming/activity-planner/SKILL.md) | "Provides Plan puzzle-based activities for classrooms,... | puzzle activity planner, education... |
| [adhx](../../skills/programming/adhx/SKILL.md) | Provides Fetch any X/Twitter post as clean LLM-friendly... | adhx, uncategorized... |
| [ads](../../skills/programming/ads/SKILL.md) | "Provides You are an expert performance marketer with... | paid ads, marketing... |
| [advisor](../../skills/programming/advisor/SKILL.md) | Provides Draft privacy policies, terms of service,... | legal advisor, legal... |
| [aeo-blog-writer](../../skills/programming/aeo-blog-writer/SKILL.md) | "Provides Writes long-form blog posts with TL;DR block,... | seo aeo blog writer, content... |
| [aeo-content-cluster](../../skills/programming/aeo-content-cluster/SKILL.md) | "Builds a topical authority map with a pillar page,... | seo aeo content cluster, content... |
| [aeo-content-quality-auditor](../../skills/programming/aeo-content-quality-auditor/SKILL.md) | "Audits content for SEO and AEO performance with scored... | seo aeo content quality auditor, content... |
| [aeo-internal-linking](../../skills/programming/aeo-internal-linking/SKILL.md) | "Provides Maps internal link opportunities between pages... | seo aeo internal linking, uncategorized... |
| [aeo-keyword-research](../../skills/programming/aeo-keyword-research/SKILL.md) | "Provides Researches and prioritises SEO keywords with AEO... | seo aeo keyword research, content... |
| [aeo-landing-page-writer](../../skills/programming/aeo-landing-page-writer/SKILL.md) | "Provides Writes complete, structured landing pages... | seo aeo landing page writer, uncategorized... |
| [aeo-meta-description-generator](../../skills/programming/aeo-meta-description-generator/SKILL.md) | "Provides Writes 3 title tag variants and 3 meta... | seo aeo meta description generator, uncategorized... |
| [aeo-schema-generator](../../skills/programming/aeo-schema-generator/SKILL.md) | Generates valid JSON-LD structured data for 10 schema types... | seo aeo schema generator, uncategorized... |
| [agent](../../skills/programming/agent/SKILL.md) | Provides Agente de contexto para continuidade entre... | context agent, ai... |
| [agent-brainstorming](../../skills/programming/agent-brainstorming/SKILL.md) | Provides Simulate a structured peer-review process using... | multi agent brainstorming, ai... |
| [agent-patterns](../../skills/programming/agent-patterns/SKILL.md) | Provides Design patterns for building autonomous coding... | autonomous agent patterns, ai... |
| [agentflow](../../skills/programming/agentflow/SKILL.md) | "Provides Orchestrate autonomous AI development pipelines... | agentflow, uncategorized... |
| [agentfolio](../../skills/programming/agentfolio/SKILL.md) | Provides Skill for discovering and researching autonomous... | agentfolio, ai... |
| [agentmail](../../skills/programming/agentmail/SKILL.md) | Provides Email infrastructure for AI agents. Create... | agentmail, ai... |
| [agentphone](../../skills/programming/agentphone/SKILL.md) | Provides Build AI phone agents with AgentPhone API. Use... | agentphone, ai... |
| [agents](../../skills/programming/agents/SKILL.md) | Provides Autonomous agents are AI systems that can... | autonomous agents, ai... |
| [agents](../../skills/programming/agents/SKILL.md) | Provides Voice agents represent the frontier of AI... | voice agents, ai... |
| [agents-py](../../skills/programming/agents-py/SKILL.md) | Provides Microsoft 365 Agents SDK for Python. Build... | m365 agents py, ai... |
| [ai](../../skills/programming/ai/SKILL.md) | "Provides Geracao de imagens via Stability AI (SD3.5,... | stability ai, media... |
| [ai-engine-development](../../skills/programming/ai-engine-development/SKILL.md) | Provides Build real-time conversational AI voice engines... | voice ai engine development, ai... |
| [ai-sdk-expert](../../skills/programming/ai-sdk-expert/SKILL.md) | "Provides Expert in the Vercel AI SDK. Covers Core API... | vercel ai sdk expert, web... |
| [ai-writing](../../skills/programming/ai-writing/SKILL.md) | "Provides Audit and rewrite content to remove 21 categories... | avoid ai writing, content... |
| [algorithms](../../skills/programming/algorithms/SKILL.md) | ''Provides Comprehensive algorithm selection guide u2014... | algorithms, comprehensive... |
| [ally-health](../../skills/programming/ally-health/SKILL.md) | Provides a health assistant skill for medical information... | claude ally health, ai... |
| [alternatives](../../skills/programming/alternatives/SKILL.md) | "Provides You are an expert in creating competitor... | competitor alternatives, business... |
| [altman](../../skills/programming/altman/SKILL.md) | "Provides Agente que simula Sam Altman — CEO da OpenAI,... | sam altman, ai... |
| [analysis](../../skills/programming/analysis/SKILL.md) | "Provides Find similar vulnerabilities and bugs across... | variant analysis, uncategorized... |
| [analyst](../../skills/programming/analyst/SKILL.md) | Provides Master modern business analysis with AI-powered... | business analyst, business... |
| [analyst](../../skills/programming/analyst/SKILL.md) | "Provides Build financial models, backtest trading... | quant analyst, business... |
| [analyst](../../skills/programming/analyst/SKILL.md) | "Provides Expert startup business analyst specializing in... | startup analyst, business... |
| [analyzer](../../skills/programming/analyzer/SKILL.md) | "Provides AI驱动的综合健康分析系 统，整合多维度健康数据、识别 异常模式、预测健康风险、提供... | ai analyzer, ai... |
| [analyzer](../../skills/programming/analyzer/SKILL.md) | "Provides 分析运动数据、识别运 动模式、评估健身进展，并提供 个性化训练建议。支持与慢性病 数据的关联分析。... | fitness analyzer, health... |
| [analyzer](../../skills/programming/analyzer/SKILL.md) | "Provides 分析健康目标数据、识 别目标模式、评估目标进度,并提 供个性化目标管理建议。支持与... | goal analyzer, health... |
| [analyzer](../../skills/programming/analyzer/SKILL.md) | "Provides 分析营养数据、识别营 养模式、评估营养状况，并提供 个性化营养建议。支持与运动、... | nutrition analyzer, health... |
| [analyzer](../../skills/programming/analyzer/SKILL.md) | "Provides 分析康复训练数据、识 别康复模式、评估康复进展，并 提供个性化康复建议 functionality... | rehabilitation analyzer, health... |
| [analyzer](../../skills/programming/analyzer/SKILL.md) | "Provides 分析睡眠数据、识别睡 眠模式、评估睡眠质量，并提供 个性化睡眠改善建议。支持与其... | sleep analyzer, health... |
| [analyzer](../../skills/programming/analyzer/SKILL.md) | "Provides 分析减肥数据、计算代 谢率、追踪能量缺口、管理减肥 阶段 functionality and... | weightloss analyzer, health... |
| [and-analyze-video](../../skills/programming/and-analyze-video/SKILL.md) | Provides Seek and analyze video content using Memories.ai... | seek and analyze video, data... |
| [angular](../../skills/programming/angular/SKILL.md) | "Provides Modern Angular (v20+) expert with deep knowledge... | angular, web... |
| [animation](../../skills/programming/animation/SKILL.md) | "Provides Advanced JavaScript animation library skill for... | animejs animation, web... |
| [animation](../../skills/programming/animation/SKILL.md) | "Provides Three.js animation - keyframe animation, skeletal... | threejs animation, web... |
| [animator](../../skills/programming/animator/SKILL.md) | "Provides AI-powered animation tool for creating motion in... | magic animator, uncategorized... |
| [api](../../skills/programming/api/SKILL.md) | 'Provides Build apps with the Claude API or Anthropic SDK.... | claude api, ai... |
| [api-dev](../../skills/programming/api-dev/SKILL.md) | 'Provides the gemini api provides access to google''s most... | gemini api dev, ai... |
| [api-routes](../../skills/programming/api-routes/SKILL.md) | "Provides Guidelines for creating API routes in Expo Router... | expo api routes, mobile... |
| [app-architecture](../../skills/programming/app-architecture/SKILL.md) | ''CRITICAL: Use for Robius app architecture patterns.... | robius app architecture, robius-app-architecture... |
| [app-patterns](../../skills/programming/app-patterns/SKILL.md) | Provides Production-ready patterns for building LLM... | llm app patterns, data... |
| [application-dev-ai-assistant](../../skills/programming/application-dev-ai-assistant/SKILL.md) | Provides You are an AI assistant development expert... | llm application dev ai assistant, ai... |
| [application-dev-langchain-agent](../../skills/programming/application-dev-langchain-agent/SKILL.md) | Provides You are an expert LangChain agent developer... | llm application dev langchain agent, ai... |
| [application-dev-prompt-optimize](../../skills/programming/application-dev-prompt-optimize/SKILL.md) | Provides You are an expert prompt engineer specializing in... | llm application dev prompt optimize, ai... |
| [ar](../../skills/programming/ar/SKILL.md) | "Provides VR/AR development principles. Comfort,... | vr ar, game... |
| [arc-designer](../../skills/programming/arc-designer/SKILL.md) | "Provides one sentence - what this skill does and when to... | emotional arc designer, uncategorized... |
| [architect](../../skills/programming/architect/SKILL.md) | "Provides Expert .NET backend architect specializing in C#,... | dotnet architect, development... |
| [architect](../../skills/programming/architect/SKILL.md) | "Provides Expert in monorepo architecture, build systems,... | monorepo architect, development... |
| [architect](../../skills/programming/architect/SKILL.md) | "Provides Complete toolkit for senior architect with modern... | senior architect, development... |
| [architect](../../skills/programming/architect/SKILL.md) | "Provides You are a documentation architect that produces... | wiki architect, content... |
| [architecture](../../skills/programming/architecture/SKILL.md) | Provides Master the LangChain framework for building... | langchain architecture, ai... |
| [architecture-review](../../skills/programming/architecture-review/SKILL.md) | "Provides Review Bitcoin Lightning Network protocol... | lightning architecture review, blockchain... |
| [art](../../skills/programming/art/SKILL.md) | "Provides Algorithmic philosophies are computational... | algorithmic art, graphics... |
| [art](../../skills/programming/art/SKILL.md) | "Provides Game art principles. Visual style selection,... | game art, game... |
| [article-publisher-skill](../../skills/programming/article-publisher-skill/SKILL.md) | "Provides publish articles to x/twitter functionality and... | x article publisher skill, marketing... |
| [artifacts-builder](../../skills/programming/artifacts-builder/SKILL.md) | 'Provides To build powerful frontend claude.ai artifacts,... | web artifacts builder, web... |
| [astropy](../../skills/programming/astropy/SKILL.md) | Provides Astropy is the core Python package for astronomy,... | astropy, science... |
| [async](../../skills/programming/async/SKILL.md) | "Provides Practical async patterns using TaskEither - clean... | fp async, development... |
| [async-patterns](../../skills/programming/async-patterns/SKILL.md) | "Provides Master Rust async programming with Tokio, async... | rust async patterns, development... |
| [audio](../../skills/programming/audio/SKILL.md) | "Provides Game audio principles. Sound design, music... | game audio, game... |
| [audit](../../skills/programming/audit/SKILL.md) | "Provides Diagnose and audit SEO issues affecting... | seo audit, content... |
| [audit](../../skills/programming/audit/SKILL.md) | "Provides Audit screens against Nielsen's heuristics and... | ux audit, design... |
| [audit-patterns](../../skills/programming/audit-patterns/SKILL.md) | "Provides Comprehensive guide to auditing web content... | wcag audit patterns, design... |
| [audit-pre-push](../../skills/programming/audit-pre-push/SKILL.md) | 'Provides Deep audit before GitHub push: removes junk... | codebase audit pre push, development... |
| [auth](../../skills/programming/auth/SKILL.md) | "Provides Expert patterns for Clerk auth implementation,... | clerk auth, uncategorized... |
| [authority-builder](../../skills/programming/authority-builder/SKILL.md) | "Analyzes content for E-E-A-T signals and suggests... | seo authority builder, content... |
| [automated-tests](../../skills/programming/automated-tests/SKILL.md) | "Provides Write and run Odoo automated tests using... | odoo automated tests, business... |
| [automation](../../skills/programming/automation/SKILL.md) | 'Provides Automate ActiveCampaign tasks via Rube MCP... | activecampaign automation, marketing... |
| [automation](../../skills/programming/automation/SKILL.md) | 'Provides Automate Amplitude tasks via Rube MCP (Composio):... | amplitude automation, data... |
| [automation](../../skills/programming/automation/SKILL.md) | 'Provides Automate Asana tasks via Rube MCP (Composio):... | asana automation, project... |
| [automation](../../skills/programming/automation/SKILL.md) | 'Provides Automate BambooHR tasks via Rube MCP (Composio):... | bamboohr automation, business... |
| [automation](../../skills/programming/automation/SKILL.md) | "Provides Automate Basecamp project management, to-dos,... | basecamp automation, project... |
| [automation](../../skills/programming/automation/SKILL.md) | "Provides Master automated billing systems including... | billing automation, uncategorized... |
| [automation](../../skills/programming/automation/SKILL.md) | "Provides Automate Box operations including file... | box automation, productivity... |
| [automation](../../skills/programming/automation/SKILL.md) | "Provides Automate Brevo (formerly Sendinblue) email... | brevo automation, marketing... |
| [automation](../../skills/programming/automation/SKILL.md) | "Provides Automate Calendly scheduling, event management,... | calendly automation, productivity... |
| [automation](../../skills/programming/automation/SKILL.md) | 'Provides Automate Canva tasks via Rube MCP (Composio):... | canva automation, design... |
| [automation](../../skills/programming/automation/SKILL.md) | 'Provides Automate Close CRM tasks via Rube MCP (Composio):... | close automation, uncategorized... |
| [automation](../../skills/programming/automation/SKILL.md) | 'Provides Automate Coda tasks via Rube MCP (Composio):... | coda automation, uncategorized... |
| [automation](../../skills/programming/automation/SKILL.md) | "Provides Automate Confluence page creation, content... | confluence automation, project... |
| [automation](../../skills/programming/automation/SKILL.md) | 'Provides Automate ConvertKit (Kit) tasks via Rube MCP... | convertkit automation, marketing... |
| [automation](../../skills/programming/automation/SKILL.md) | 'Provides Automate DocuSign tasks via Rube MCP (Composio):... | docusign automation, productivity... |
| [automation](../../skills/programming/automation/SKILL.md) | "Provides Automate Dropbox file management, sharing,... | dropbox automation, productivity... |
| [automation](../../skills/programming/automation/SKILL.md) | 'Provides Automate Figma tasks via Rube MCP (Composio):... | figma automation, design... |
| [automation](../../skills/programming/automation/SKILL.md) | 'Provides Automate Freshservice ITSM tasks via Rube MCP... | freshservice automation, project... |
| [automation](../../skills/programming/automation/SKILL.md) | "Provides Lightweight Gmail integration with standalone... | gmail automation, productivity... |
| [automation](../../skills/programming/automation/SKILL.md) | "Provides Automate Google Sheets operations (read, write,... | googlesheets automation, spreadsheet... |
| [automation](../../skills/programming/automation/SKILL.md) | 'Provides Automate Instagram tasks via Rube MCP (Composio):... | instagram automation, marketing... |
| [automation](../../skills/programming/automation/SKILL.md) | 'Provides Automate Jira tasks via Rube MCP (Composio):... | jira automation, project... |
| [automation](../../skills/programming/automation/SKILL.md) | 'Provides Automate Klaviyo tasks via Rube MCP (Composio):... | klaviyo automation, marketing... |
| [automation](../../skills/programming/automation/SKILL.md) | 'Provides Automate Linear tasks via Rube MCP (Composio):... | linear automation, project... |
| [automation](../../skills/programming/automation/SKILL.md) | 'Provides Automate LinkedIn tasks via Rube MCP (Composio):... | linkedin automation, marketing... |
| [automation](../../skills/programming/automation/SKILL.md) | "Provides Automate Mailchimp email marketing including... | mailchimp automation, marketing... |
| [automation](../../skills/programming/automation/SKILL.md) | 'Provides Automate Miro tasks via Rube MCP (Composio):... | miro automation, project... |
| [automation](../../skills/programming/automation/SKILL.md) | 'Provides Automate Mixpanel tasks via Rube MCP (Composio):... | mixpanel automation, data... |
| [automation](../../skills/programming/automation/SKILL.md) | "Provides Automate Monday.com work management including... | monday automation, project... |
| [automation](../../skills/programming/automation/SKILL.md) | "Provides Automate Pipedrive CRM operations including... | pipedrive automation, business... |
| [automation](../../skills/programming/automation/SKILL.md) | 'Provides Automate PostHog tasks via Rube MCP (Composio):... | posthog automation, data... |
| [automation](../../skills/programming/automation/SKILL.md) | 'Provides Automate Reddit tasks via Rube MCP (Composio):... | reddit automation, marketing... |
| [automation](../../skills/programming/automation/SKILL.md) | 'Provides Automate Segment tasks via Rube MCP (Composio):... | segment automation, data... |
| [automation](../../skills/programming/automation/SKILL.md) | "Provides Automate Supabase database queries, table... | supabase automation, uncategorized... |
| [automation](../../skills/programming/automation/SKILL.md) | 'Provides Automate TikTok tasks via Rube MCP (Composio):... | tiktok automation, marketing... |
| [automation](../../skills/programming/automation/SKILL.md) | "Provides Automate Todoist task management, projects,... | todoist automation, project... |
| [automation](../../skills/programming/automation/SKILL.md) | "Provides Automate Trello boards, cards, and workflows via... | trello automation, project... |
| [automation](../../skills/programming/automation/SKILL.md) | 'Provides Automate Twitter/X tasks via Rube MCP (Composio):... | twitter automation, marketing... |
| [automation](../../skills/programming/automation/SKILL.md) | 'Provides Automate Vercel tasks via Rube MCP (Composio):... | vercel automation, uncategorized... |
| [automation](../../skills/programming/automation/SKILL.md) | "Provides Automate Webflow CMS collections, site... | webflow automation, design... |
| [automation](../../skills/programming/automation/SKILL.md) | 'Provides Automate Wrike project management via Rube MCP... | wrike automation, project... |
| [automation](../../skills/programming/automation/SKILL.md) | 'Provides Automate YouTube tasks via Rube MCP (Composio):... | youtube automation, marketing... |
| [automator](../../skills/programming/automator/SKILL.md) | "Provides Draft cold emails, follow-ups, and proposal... | sales automator, business... |
| [avaliacao](../../skills/programming/avaliacao/SKILL.md) | "Provides Avaliacao pericial de imoveis em leilao. Valor de... | leiloeiro avaliacao, leiloeiro... |
| [aversion-designer](../../skills/programming/aversion-designer/SKILL.md) | "Provides one sentence - what this skill does and when to... | loss aversion designer, uncategorized... |
| [axiom](../../skills/programming/axiom/SKILL.md) | "Provides First-principles assumption auditor. Classifies... | axiom, uncategorized... |
| [backend](../../skills/programming/backend/SKILL.md) | "Provides Functional programming patterns for Node.js/Deno... | fp backend, development... |
| [backup-strategy](../../skills/programming/backup-strategy/SKILL.md) | 'Provides Complete Odoo backup and restore strategy:... | odoo backup strategy, business... |
| [bases](../../skills/programming/bases/SKILL.md) | Provides Create and edit Obsidian Bases (.base files) with... | obsidian bases, uncategorized... |
| [basics](../../skills/programming/basics/SKILL.md) | "CRITICAL: Use for Makepad getting started and app... | makepad basics, development... |
| [batch-refactor](../../skills/programming/batch-refactor/SKILL.md) | "Provides Plan and execute large refactors with... | orchestrate batch refactor, uncategorized... |
| [bd-agent](../../skills/programming/bd-agent/SKILL.md) | "Provides Production-tested patterns for building AI agents... | crypto bd agent, blockchain... |
| [best-practices](../../skills/programming/best-practices/SKILL.md) | "Provides Angular performance optimization and best... | angular best practices, web... |
| [best-practices](../../skills/programming/best-practices/SKILL.md) | "Provides Comprehensive performance optimization guide for... | react best practices, web... |
| [best-practices](../../skills/programming/best-practices/SKILL.md) | "Provides best practices for remotion - video creation in... | remotion best practices, media... |
| [biopython](../../skills/programming/biopython/SKILL.md) | "Provides Biopython is a comprehensive set of freely... | biopython, science... |
| [blockrun](../../skills/programming/blockrun/SKILL.md) | "Provides blockrun works with claude code and google... | blockrun, uncategorized... |
| [bot-architect](../../skills/programming/bot-architect/SKILL.md) | "Provides Specialized skill for building production-ready... | discord bot architect, web... |
| [brainstorming](../../skills/programming/brainstorming/SKILL.md) | "Provides use before creative or constructive work... | brainstorming, uncategorized... |
| [buffett](../../skills/programming/buffett/SKILL.md) | "Provides Agente que simula Warren Buffett — o maior... | warren buffett, uncategorized... |
| [build](../../skills/programming/build/SKILL.md) | "Provides Build, maintain, and extend the EarLLM One... | earllm build, uncategorized... |
| [build-optimization](../../skills/programming/build-optimization/SKILL.md) | "Provides Optimize Bazel builds for large-scale monorepos.... | bazel build optimization, development... |
| [builder](../../skills/programming/builder/SKILL.md) | Provides Main application building orchestrator. Creates... | app builder, ai... |
| [builder](../../skills/programming/builder/SKILL.md) | "Creates exhaustive technical references and API... | reference builder, content... |
| [bukkit-pro](../../skills/programming/bukkit-pro/SKILL.md) | "Provides Master Minecraft server plugin development with... | minecraft bukkit pro, game... |
| [bulletmind](../../skills/programming/bulletmind/SKILL.md) | "Provides Convert input into clean, structured,... | bulletmind, writing... |
| [business-analyst-business-case](../../skills/programming/business-analyst-business-case/SKILL.md) | "Generate comprehensive investor-ready business case... | startup business analyst business case, business... |
| [business-analyst-financial-projections](../../skills/programming/business-analyst-financial-projections/SKILL.md) | "Create detailed 3-5 year financial model with revenue,... | startup business analyst financial projections, business... |
| [business-analyst-market-opportunity](../../skills/programming/business-analyst-market-opportunity/SKILL.md) | "Generate comprehensive market opportunity analysis with... | startup business analyst market opportunity, business... |
| [buttercup](../../skills/programming/buttercup/SKILL.md) | "Provides All pods run in namespace crs. Use when pods in... | debug buttercup, uncategorized... |
| [caching](../../skills/programming/caching/SKILL.md) | Provides Caching strategies for LLM prompts including... | prompt caching, ai... |
| [caching](../../skills/programming/caching/SKILL.md) | "Provides Configure Turborepo for efficient monorepo builds... | turborepo caching, development... |
| [calc](../../skills/programming/calc/SKILL.md) | "Provides Spreadsheet creation, format conversion... | calc, spreadsheet... |
| [calendar-automation](../../skills/programming/calendar-automation/SKILL.md) | "Provides Lightweight Google Calendar integration with... | google calendar automation, productivity... |
| [calibrator](../../skills/programming/calibrator/SKILL.md) | "Provides one sentence - what this skill does and when to... | trust calibrator, uncategorized... |
| [cannibalization-detector](../../skills/programming/cannibalization-detector/SKILL.md) | "Analyzes multiple provided pages to identify keyword... | seo cannibalization detector, content... |
| [canvas](../../skills/programming/canvas/SKILL.md) | "Provides Create and edit JSON Canvas files (.canvas) with... | json canvas, uncategorized... |
| [canvas-architect](../../skills/programming/canvas-architect/SKILL.md) | "Provides Iterative consultant agent for building and... | osterwalder canvas architect, business... |
| [card](../../skills/programming/card/SKILL.md) | "Provides 生成紧急情况下快速访 问的医疗信息摘要卡片。当用户 需要旅行、就诊准备、紧急情况 或询问... | emergency card, health... |
| [carlo-monitor-creation](../../skills/programming/carlo-monitor-creation/SKILL.md) | "Guides creation of Monte Carlo monitors via MCP tools,... | monte carlo monitor creation, data... |
| [carlo-prevent](../../skills/programming/carlo-prevent/SKILL.md) | Provides Surfaces Monte Carlo data observability context... | monte carlo prevent, data... |
| [carlo-push-ingestion](../../skills/programming/carlo-push-ingestion/SKILL.md) | Provides Expert guide for pushing metadata, lineage, and... | monte carlo push ingestion, data... |
| [carlo-validation-notebook](../../skills/programming/carlo-validation-notebook/SKILL.md) | Generates SQL validation notebooks for dbt PR changes with... | monte carlo validation notebook, data... |
| [cdp](../../skills/programming/cdp/SKILL.md) | Provides Expert patterns for Segment Customer Data Platform... | segment cdp, data... |
| [centric-high-seo-optimized-blogwriting-skill](../../skills/programming/centric-high-seo-optimized-blogwriting-skill/SKILL.md) | "Provides use this skill when the user asks to write a blog... | wordpress centric high seo optimized blogwriting skill, content... |
| [chain-risk-auditor](../../skills/programming/chain-risk-auditor/SKILL.md) | "Provides Identifies dependencies at heightened risk of... | supply chain risk auditor, uncategorized... |
| [change-tracker](../../skills/programming/change-tracker/SKILL.md) | "Provides Track code changes with structured JSON records,... | technical change tracker, development... |
| [changelog](../../skills/programming/changelog/SKILL.md) | "Provides Generate structured changelogs from git history.... | wiki changelog, content... |
| [channel-factories](../../skills/programming/channel-factories/SKILL.md) | "Provides Technical reference on Lightning Network channel... | lightning channel factories, blockchain... |
| [chat-agent-discovery](../../skills/programming/chat-agent-discovery/SKILL.md) | "Provides Discover and search 18K+ MCP servers and AI... | global chat agent discovery, development... |
| [check](../../skills/programming/check/SKILL.md) | "Provides Validate Claude Code skills against the... | skill check, development... |
| [chinese](../../skills/programming/chinese/SKILL.md) | "Provides Detect and rewrite AI-like Chinese text with a... | humanize chinese, content... |
| [cicd-workflows](../../skills/programming/cicd-workflows/SKILL.md) | "Provides Helps understand and write EAS workflow YAML... | expo cicd workflows, mobile... |
| [cirq](../../skills/programming/cirq/SKILL.md) | "Provides Cirq is Google Quantum AI's open-source framework... | cirq, science... |
| [claude-skill](../../skills/programming/claude-skill/SKILL.md) | "Provides manage linear issues, projects, and teams... | linear claude skill, project... |
| [cleanup-deps-audit](../../skills/programming/cleanup-deps-audit/SKILL.md) | "Provides You are a dependency security expert specializing... | codebase cleanup deps audit, development... |
| [cleanup-refactor-clean](../../skills/programming/cleanup-refactor-clean/SKILL.md) | "Provides You are a code refactoring expert specializing in... | codebase cleanup refactor clean, development... |
| [cli](../../skills/programming/cli/SKILL.md) | "Provides GDB debugging assistant for AI agents - analyze... | gdb cli, development... |
| [cli](../../skills/programming/cli/SKILL.md) | 'Provides use when automating linkedin via cli: fetch... | linkedin cli, marketing... |
| [cli](../../skills/programming/cli/SKILL.md) | "Provides use mmx to generate text, images, video, speech,... | mmx cli, uncategorized... |
| [cli](../../skills/programming/cli/SKILL.md) | "Provides use the obsidian cli to read, create, search, and... | obsidian cli, uncategorized... |
| [cli](../../skills/programming/cli/SKILL.md) | "Provides Semantic file discovery via `vexor`. Use whenever... | vexor cli, development... |
| [clipper-template-creator](../../skills/programming/clipper-template-creator/SKILL.md) | "Provides Guide for creating templates for the Obsidian Web... | obsidian clipper template creator, uncategorized... |
| [coach](../../skills/programming/coach/SKILL.md) | "Provides Full job search coaching system — JD decoding,... | interview coach, productivity... |
| [coauthoring](../../skills/programming/coauthoring/SKILL.md) | "Provides this skill provides a structured workflow for... | doc coauthoring, document... |
| [code](../../skills/programming/code/SKILL.md) | "Provides Generate React code with Rayden UI components... | rayden code, development... |
| [code](../../skills/programming/code/SKILL.md) | "Provides Review a diff for clarity and safe... | simplify code, uncategorized... |
| [code-expert](../../skills/programming/code-expert/SKILL.md) | Provides Especialista profundo em Claude Code - CLI da... | claude code expert, ai... |
| [code-guide](../../skills/programming/code-guide/SKILL.md) | Provides To provide a comprehensive reference for... | claude code guide, ai... |
| [collaboration-issue](../../skills/programming/collaboration-issue/SKILL.md) | "Provides You are a GitHub issue resolution expert... | team collaboration issue, project... |
| [collaboration-standup-notes](../../skills/programming/collaboration-standup-notes/SKILL.md) | "Provides You are an expert team communication specialist... | team collaboration standup notes, project... |
| [com-automation](../../skills/programming/com-automation/SKILL.md) | 'Provides Automate Cal.com tasks via Rube MCP (Composio):... | cal com automation, productivity... |
| [comms](../../skills/programming/comms/SKILL.md) | "Provides Write internal communications such as status... | internal comms, uncategorized... |
| [comms-anthropic](../../skills/programming/comms-anthropic/SKILL.md) | 'Provides to write internal communications, use this skill... | internal comms anthropic, content... |
| [comms-community](../../skills/programming/comms-community/SKILL.md) | 'Provides to write internal communications, use this skill... | internal comms community, content... |
| [competitor-pages](../../skills/programming/competitor-pages/SKILL.md) | "Provides Generate SEO-optimized competitor comparison and... | seo competitor pages, uncategorized... |
| [compliance-accessibility-audit](../../skills/programming/compliance-accessibility-audit/SKILL.md) | "Provides You are an accessibility expert specializing in... | accessibility compliance accessibility audit, design... |
| [component](../../skills/programming/component/SKILL.md) | "Provides Generate a new UI component that follows... | ui component, design... |
| [component-performance](../../skills/programming/component-performance/SKILL.md) | Provides Diagnose slow React components and suggest... | react component performance, web... |
| [components](../../skills/programming/components/SKILL.md) | "Provides Core component library and design system... | core components, web... |
| [components-content](../../skills/programming/components-content/SKILL.md) | "Provides Apple Human Interface Guidelines for content... | hig components content, development... |
| [components-controls](../../skills/programming/components-controls/SKILL.md) | "Provides Check for .claude/apple-design-context.md before... | hig components controls, development... |
| [components-dialogs](../../skills/programming/components-dialogs/SKILL.md) | "Provides Apple HIG guidance for presentation components... | hig components dialogs, development... |
| [components-layout](../../skills/programming/components-layout/SKILL.md) | "Provides Apple Human Interface Guidelines for layout and... | hig components layout, development... |
| [components-menus](../../skills/programming/components-menus/SKILL.md) | "Provides Check for .claude/apple-design-context.md before... | hig components menus, development... |
| [components-search](../../skills/programming/components-search/SKILL.md) | "Provides Apple HIG guidance for navigation-related... | hig components search, development... |
| [components-status](../../skills/programming/components-status/SKILL.md) | "Provides Apple HIG guidance for status and progress UI... | hig components status, development... |
| [components-system](../../skills/programming/components-system/SKILL.md) | 'Provides Apple HIG guidance for system experience... | hig components system, development... |
| [composition-analysis](../../skills/programming/composition-analysis/SKILL.md) | "Provides Design optimal team structures, hiring plans,... | team composition analysis, business... |
| [compression](../../skills/programming/compression/SKILL.md) | Implements when agent sessions generate millions of tokens... | context compression, ai... |
| [concurrency-expert](../../skills/programming/concurrency-expert/SKILL.md) | "Provides Review and fix Swift concurrency issues such as... | swift concurrency expert, uncategorized... |
| [concurrency-patterns](../../skills/programming/concurrency-patterns/SKILL.md) | "Provides Master Go concurrency with goroutines, channels,... | go concurrency patterns, development... |
| [configuration](../../skills/programming/configuration/SKILL.md) | Provides Complete guide to Prometheus setup, metric... | prometheus configuration, uncategorized... |
| [constitution-analyzer](../../skills/programming/constitution-analyzer/SKILL.md) | "Provides 分析中医体质数据、识 别体质类型、评估体质特征,并提 供个性化养生建议。支持与营养... | tcm constitution analyzer, health... |
| [content](../../skills/programming/content/SKILL.md) | "Provides Content quality and E-E-A-T analysis with AI... | seo content, content... |
| [content](../../skills/programming/content/SKILL.md) | "Provides You are an expert social media strategist with... | social content, marketing... |
| [content-auditor](../../skills/programming/content-auditor/SKILL.md) | "Analyzes provided content for quality, E-E-A-T signals,... | seo content auditor, content... |
| [content-planner](../../skills/programming/content-planner/SKILL.md) | "Creates comprehensive content outlines and topic clusters... | seo content planner, content... |
| [content-refresher](../../skills/programming/content-refresher/SKILL.md) | "Provides Identifies outdated elements in provided content... | seo content refresher, content... |
| [content-writer](../../skills/programming/content-writer/SKILL.md) | "Provides Writes SEO-optimized content based on provided... | seo content writer, content... |
| [contract-templates](../../skills/programming/contract-templates/SKILL.md) | "Provides Templates and patterns for creating legally sound... | employment contract templates, legal... |
| [copy](../../skills/programming/copy/SKILL.md) | "Provides Generate UX microcopy in StyleSeed's... | ux copy, design... |
| [copywriting](../../skills/programming/copywriting/SKILL.md) | "Provides Write rigorous, conversion-focused marketing copy... | copywriting, marketing... |
| [coroutines-expert](../../skills/programming/coroutines-expert/SKILL.md) | "Provides Expert patterns for Kotlin Coroutines and Flow,... | kotlin coroutines expert, development... |
| [cortex-expert](../../skills/programming/cortex-expert/SKILL.md) | "Provides Senior embedded software engineer specializing in... | arm cortex expert, development... |
| [creative](../../skills/programming/creative/SKILL.md) | "Provides Create, iterate, and scale paid ad creative for... | ad creative, uncategorized... |
| [creator](../../skills/programming/creator/SKILL.md) | "Provides Professional-grade brand voice analysis, SEO... | content creator, marketing... |
| [crewai](../../skills/programming/crewai/SKILL.md) | "Provides Expert in CrewAI - the leading role-based... | crewai, uncategorized... |
| [criminal](../../skills/programming/criminal/SKILL.md) | "Provides Advogado criminalista especializado em Maria da... | advogado criminal, legal... |
| [crm-automation](../../skills/programming/crm-automation/SKILL.md) | 'Provides Automate Zoho CRM tasks via Rube MCP (Composio):... | zoho crm automation, business... |
| [cro](../../skills/programming/cro/SKILL.md) | "Provides Optimize any form that is NOT signup or account... | form cro, marketing... |
| [cro](../../skills/programming/cro/SKILL.md) | "Provides You are an expert in user onboarding and... | onboarding cro, marketing... |
| [cro](../../skills/programming/cro/SKILL.md) | "Provides Analyze and optimize individual pages for... | page cro, marketing... |
| [cro](../../skills/programming/cro/SKILL.md) | "Provides Create and optimize popups, modals, overlays,... | popup cro, marketing... |
| [crypto-wallet](../../skills/programming/crypto-wallet/SKILL.md) | "Provides Crypto wallet management across 7 blockchains via... | emblemai crypto wallet, uncategorized... |
| [d3js-skill](../../skills/programming/d3js-skill/SKILL.md) | Provides this skill provides guidance for creating... | claude d3js skill, ai... |
| [daily](../../skills/programming/daily/SKILL.md) | "Provides documentation and capabilities reference for... | daily, uncategorized... |
| [darwin](../../skills/programming/darwin/SKILL.md) | "Provides Darwinian idea evolution engine — toss rough... | idea darwin, uncategorized... |
| [dashboard-design](../../skills/programming/dashboard-design/SKILL.md) | "Provides Comprehensive patterns for designing effective... | kpi dashboard design, business... |
| [data-fetching](../../skills/programming/data-fetching/SKILL.md) | Provides use when implementing or debugging any network... | native data fetching, development... |
| [data-transforms](../../skills/programming/data-transforms/SKILL.md) | Provides Everyday data transformations using functional... | fp data transforms, development... |
| [database-engineer](../../skills/programming/database-engineer/SKILL.md) | Provides Expert in vector databases, embedding strategies,... | vector database engineer, data... |
| [database-query](../../skills/programming/database-query/SKILL.md) | Provides food database query functionality and capabilities. | food database query, health... |
| [dataforseo](../../skills/programming/dataforseo/SKILL.md) | Provides use dataforseo for live serps, keyword metrics,... | seo dataforseo, uncategorized... |
| [debugger-agent](../../skills/programming/debugger-agent/SKILL.md) | "Provides Debug the current iOS project on a booted... | ios debugger agent, mobile... |
| [debugging-error-analysis](../../skills/programming/debugging-error-analysis/SKILL.md) | "Provides You are an expert error analysis specialist with... | error debugging error analysis, development... |
| [debugging-error-trace](../../skills/programming/debugging-error-trace/SKILL.md) | "Provides You are an error tracking and observability... | error debugging error trace, development... |
| [debugging-multi-agent-review](../../skills/programming/debugging-multi-agent-review/SKILL.md) | "Provides use when working with error debugging multi agent... | error debugging multi agent review, development... |
| [defensive-patterns](../../skills/programming/defensive-patterns/SKILL.md) | "Provides Master defensive Bash programming techniques for... | bash defensive patterns, development... |
| [defuddle](../../skills/programming/defuddle/SKILL.md) | "Provides Extract clean markdown content from web pages... | defuddle, content... |
| [degradation](../../skills/programming/degradation/SKILL.md) | Provides Language models exhibit predictable degradation... | context degradation, ai... |
| [demand-planning](../../skills/programming/demand-planning/SKILL.md) | "Provides Codified expertise for demand forecasting, safety... | inventory demand planning, business... |
| [deployment](../../skills/programming/deployment/SKILL.md) | Provides deploy expo apps to production functionality and... | expo deployment, mobile... |
| [deployment](../../skills/programming/deployment/SKILL.md) | "CRITICAL: Use for Makepad packaging and deployment.... | makepad deployment, development... |
| [deployment](../../skills/programming/deployment/SKILL.md) | Provides expert knowledge for deploying to vercel with... | vercel deployment, uncategorized... |
| [design](../../skills/programming/design/SKILL.md) | "Provides These are instructions for creating design... | canvas design, graphics... |
| [design](../../skills/programming/design/SKILL.md) | "Provides Game design principles. GDD structure, balancing,... | game design, game... |
| [design](../../skills/programming/design/SKILL.md) | "Provides (mobile-first · touch-first ·... | mobile design, mobile... |
| [design](../../skills/programming/design/SKILL.md) | "Provides Design de produto nivel Apple — sistemas visuais,... | product design, business... |
| [design](../../skills/programming/design/SKILL.md) | Provides Build tools that agents can use effectively,... | tool design, ai... |
| [design-expert](../../skills/programming/design-expert/SKILL.md) | "Provides Core UI/UX engineering skill for building highly... | antigravity design expert, design... |
| [design-guidelines](../../skills/programming/design-guidelines/SKILL.md) | "Provides review files for compliance with web interface... | web design guidelines, design... |
| [design-system](../../skills/programming/design-system/SKILL.md) | "Provides Build production-ready design systems with... | tailwind design system, web... |
| [detective](../../skills/programming/detective/SKILL.md) | "Provides Search logs and codebases for error patterns,... | error detective, development... |
| [dev-client](../../skills/programming/dev-client/SKILL.md) | "Provides Build and distribute Expo development clients... | expo dev client, mobile... |
| [developer](../../skills/programming/developer/SKILL.md) | "Provides Build production-ready Web3 applications, smart... | blockchain developer, blockchain... |
| [developer](../../skills/programming/developer/SKILL.md) | Provides Develop native iOS applications with... | ios developer, mobile... |
| [developer](../../skills/programming/developer/SKILL.md) | "Provides Develop React Native, Flutter, or native mobile... | mobile developer, mobile... |
| [developer](../../skills/programming/developer/SKILL.md) | "Provides Build Unity games with optimized C# scripts,... | unity developer, game... |
| [development](../../skills/programming/development/SKILL.md) | "Provides Fast, modern JavaScript/TypeScript development... | bun development, web... |
| [development](../../skills/programming/development/SKILL.md) | "Provides Master Electron desktop app development with... | electron development, development... |
| [development](../../skills/programming/development/SKILL.md) | "Provides Game development orchestrator. Routes to... | game development, game... |
| [development](../../skills/programming/development/SKILL.md) | Provides this skill covers the principles for identifying... | project development, ai... |
| [development](../../skills/programming/development/SKILL.md) | Provides Comprehensive Snowflake development assistant... | snowflake development, data... |
| [development-python-scaffold](../../skills/programming/development-python-scaffold/SKILL.md) | "Provides You are a Python project architecture expert... | python development python scaffold, development... |
| [diagnostics-error-analysis](../../skills/programming/diagnostics-error-analysis/SKILL.md) | "Provides You are an expert error analysis specialist with... | error diagnostics error analysis, development... |
| [diagnostics-error-trace](../../skills/programming/diagnostics-error-trace/SKILL.md) | "Provides You are an error tracking and observability... | error diagnostics error trace, development... |
| [diagnostics-smart-debug](../../skills/programming/diagnostics-smart-debug/SKILL.md) | "Provides use when working with error diagnostics smart... | error diagnostics smart debug, development... |
| [docker-deployment](../../skills/programming/docker-deployment/SKILL.md) | Provides Production-ready Docker and docker-compose setup... | odoo docker deployment, business... |
| [documentation-code-explain](../../skills/programming/documentation-code-explain/SKILL.md) | "Provides You are a code education expert specializing in... | code documentation code explain, development... |
| [documentation-doc-generate](../../skills/programming/documentation-doc-generate/SKILL.md) | "Provides You are a documentation expert specializing in... | code documentation doc generate, development... |
| [draw](../../skills/programming/draw/SKILL.md) | "Provides Vector graphics and diagram creation, format... | draw, graphics... |
| [drive-automation](../../skills/programming/drive-automation/SKILL.md) | "Provides Automate OneDrive file management, search,... | one drive automation, productivity... |
| [driven-development](../../skills/programming/driven-development/SKILL.md) | Provides Guide for implementing and maintaining context as... | context driven development, ai... |
| [dsl](../../skills/programming/dsl/SKILL.md) | "CRITICAL: Use for Makepad DSL syntax and inheritance.... | makepad dsl, development... |
| [ecommerce-configurator](../../skills/programming/ecommerce-configurator/SKILL.md) | 'Provides Expert guide for Odoo eCommerce and Website:... | odoo ecommerce configurator, business... |
| [ecs-expert](../../skills/programming/ecs-expert/SKILL.md) | Provides Master Bevy's Entity Component System (ECS) in... | bevy ecs expert, uncategorized... |
| [ecs-patterns](../../skills/programming/ecs-patterns/SKILL.md) | Provides Production patterns for Unity's Data-Oriented... | unity ecs patterns, game... |
| [edges](../../skills/programming/edges/SKILL.md) | "Provides sharp-edges functionality and capabilities." | sharp edges, uncategorized... |
| [edi-connector](../../skills/programming/edi-connector/SKILL.md) | 'Provides Guide for implementing EDI (Electronic Data... | odoo edi connector, business... |
| [edital](../../skills/programming/edital/SKILL.md) | "Provides Analise e auditoria de editais de leilao judicial... | leiloeiro edital, leiloeiro... |
| [editing](../../skills/programming/editing/SKILL.md) | "Provides You are an expert copy editor specializing in... | copy editing, marketing... |
| [either-ref](../../skills/programming/either-ref/SKILL.md) | "Provides Quick reference for Either type. Use when user... | fp either ref, development... |
| [elite](../../skills/programming/elite/SKILL.md) | "Provides Senior Elite Software Engineer (15+) and Senior... | nerdzao elite, uncategorized... |
| [elite-gemini-high](../../skills/programming/elite-gemini-high/SKILL.md) | "Provides Modo Elite Coder + UX Pixel-Perfect otimizado... | nerdzao elite gemini high, uncategorized... |
| [email](../../skills/programming/email/SKILL.md) | "Provides Write B2B cold emails and follow-up sequences... | cold email, uncategorized... |
| [emotion-engineer](../../skills/programming/emotion-engineer/SKILL.md) | "Provides one sentence - what this skill does and when to... | visual emotion engineer, uncategorized... |
| [enablement](../../skills/programming/enablement/SKILL.md) | "Provides Create sales collateral such as decks,... | sales enablement, uncategorized... |
| [endpoint-builder](../../skills/programming/endpoint-builder/SKILL.md) | "Builds production-ready REST API endpoints with... | api endpoint builder, development... |
| [engine](../../skills/programming/engine/SKILL.md) | "Provides Motor de crescimento para produtos digitais --... | growth engine, marketing... |
| [engineer](../../skills/programming/engineer/SKILL.md) | Provides Build production-ready LLM applications, advanced... | ai engineer, ai... |
| [engineer](../../skills/programming/engineer/SKILL.md) | Provides Build scalable data pipelines, modern data... | data engineer, data... |
| [engineer](../../skills/programming/engineer/SKILL.md) | Provides Build production ML systems with PyTorch 2.x,... | ml engineer, ai... |
| [engineer](../../skills/programming/engineer/SKILL.md) | Provides Build comprehensive ML pipelines, experiment... | mlops engineer, ai... |
| [engineer](../../skills/programming/engineer/SKILL.md) | "Provides Expert network engineer specializing in modern... | network engineer, uncategorized... |
| [engineer](../../skills/programming/engineer/SKILL.md) | Provides Expert performance engineer specializing in modern... | performance engineer, development... |
| [engineer](../../skills/programming/engineer/SKILL.md) | Provides Expert in building Retrieval-Augmented Generation... | rag engineer, data... |
| [engineer](../../skills/programming/engineer/SKILL.md) | "Creates step-by-step tutorials and educational content... | tutorial engineer, content... |
| [engineering](../../skills/programming/engineering/SKILL.md) | Provides Expert guide on prompt engineering patterns, best... | prompt engineering, ai... |
| [engineering-data-driven-feature](../../skills/programming/engineering-data-driven-feature/SKILL.md) | "Provides Build features guided by data insights, A/B... | data engineering data driven feature, data... |
| [engineering-data-pipeline](../../skills/programming/engineering-data-pipeline/SKILL.md) | Provides You are a data pipeline architecture expert... | data engineering data pipeline, data... |
| [engineering-patterns](../../skills/programming/engineering-patterns/SKILL.md) | Provides Master advanced prompt engineering techniques to... | prompt engineering patterns, ai... |
| [engineering-toolkit](../../skills/programming/engineering-toolkit/SKILL.md) | 'Provides 6 production-ready AI engineering workflows:... | ai engineering toolkit, data... |
| [errors](../../skills/programming/errors/SKILL.md) | "Provides Stop throwing everywhere - handle errors as... | fp errors, development... |
| [especialista](../../skills/programming/especialista/SKILL.md) | 'Provides Advogado especialista em todas as areas do... | advogado especialista, legal... |
| [estimation](../../skills/programming/estimation/SKILL.md) | "Provides Estimate AI-assisted and hybrid human+agent... | progressive estimation, project... |
| [evaluation](../../skills/programming/evaluation/SKILL.md) | Provides this skill should be used when the user asks to... | advanced evaluation, ai... |
| [evaluation](../../skills/programming/evaluation/SKILL.md) | Provides Build evaluation frameworks for agent systems. Use... | evaluation, ai... |
| [evaluation](../../skills/programming/evaluation/SKILL.md) | Provides Master comprehensive evaluation strategies for LLM... | llm evaluation, ai... |
| [event-action](../../skills/programming/event-action/SKILL.md) | "CRITICAL: Use for Makepad event and action handling.... | makepad event action, development... |
| [event-action](../../skills/programming/event-action/SKILL.md) | "CRITICAL: Use for Robius event and action patterns.... | robius event action, development... |
| [evolution](../../skills/programming/evolution/SKILL.md) | "Provides this skill enables makepad-skills to self-improve... | evolution, uncategorized... |
| [exception-management](../../skills/programming/exception-management/SKILL.md) | "Provides Codified expertise for handling freight... | logistics exception management, uncategorized... |
| [expert](../../skills/programming/expert/SKILL.md) | "Provides expertise for analyzing DWARF debug files and... | dwarf expert, development... |
| [expert](../../skills/programming/expert/SKILL.md) | "Provides Master Flutter development with Dart 3, advanced... | flutter expert, mobile... |
| [expert](../../skills/programming/expert/SKILL.md) | "Provides Expert advisor for ITIL 4 and ITIL 5 (2026... | itil expert, uncategorized... |
| [expert](../../skills/programming/expert/SKILL.md) | "Provides Create Mermaid diagrams for flowcharts,... | mermaid expert, content... |
| [expert-skill](../../skills/programming/expert-skill/SKILL.md) | "Provides Write, review, or improve SwiftUI code following... | swiftui expert skill, mobile... |
| [expo](../../skills/programming/expo/SKILL.md) | "Provides upgrade expo sdk versions functionality and... | upgrading expo, mobile... |
| [extension-builder](../../skills/programming/extension-builder/SKILL.md) | "Provides Expert in building browser extensions that solve... | browser extension builder, web... |
| [extension-guide-en](../../skills/programming/extension-guide-en/SKILL.md) | "Provides Guide for VS Code extension development from... | vscode extension guide en, core... |
| [extractor](../../skills/programming/extractor/SKILL.md) | "Extracts up to 50 highly relevant SEO keywords from text.... | keyword extractor, marketing... |
| [face-cli](../../skills/programming/face-cli/SKILL.md) | Provides use the hugging face hub cli (`hf`) to download,... | hugging face cli, ai... |
| [face-community-evals](../../skills/programming/face-community-evals/SKILL.md) | Provides Run local evaluations for Hugging Face Hub models... | hugging face community evals, ai... |
| [face-dataset-viewer](../../skills/programming/face-dataset-viewer/SKILL.md) | Provides Query Hugging Face datasets through the Dataset... | hugging face dataset viewer, ai... |
| [face-datasets](../../skills/programming/face-datasets/SKILL.md) | Provides Create and manage datasets on Hugging Face Hub.... | hugging face datasets, ai... |
| [face-evaluation](../../skills/programming/face-evaluation/SKILL.md) | Provides Add and manage evaluation results in Hugging Face... | hugging face evaluation, ai... |
| [face-gradio](../../skills/programming/face-gradio/SKILL.md) | Provides Build or edit Gradio apps, layouts, components,... | hugging face gradio, ai... |
| [face-jobs](../../skills/programming/face-jobs/SKILL.md) | Provides Run workloads on Hugging Face Jobs with managed... | hugging face jobs, ai... |
| [face-model-trainer](../../skills/programming/face-model-trainer/SKILL.md) | Provides Train or fine-tune TRL language models on Hugging... | hugging face model trainer, ai... |
| [face-paper-publisher](../../skills/programming/face-paper-publisher/SKILL.md) | Provides Publish and manage research papers on Hugging Face... | hugging face paper publisher, ai... |
| [face-papers](../../skills/programming/face-papers/SKILL.md) | Provides Read and analyze Hugging Face paper pages or arXiv... | hugging face papers, ai... |
| [face-tool-builder](../../skills/programming/face-tool-builder/SKILL.md) | Provides Your purpose is now is to create reusable command... | hugging face tool builder, ai... |
| [face-trackio](../../skills/programming/face-trackio/SKILL.md) | Provides Track ML experiments with Trackio using Python... | hugging face trackio, ai... |
| [face-vision-trainer](../../skills/programming/face-vision-trainer/SKILL.md) | Provides Train or fine-tune vision models on Hugging Face... | hugging face vision trainer, ai... |
| [factory](../../skills/programming/factory/SKILL.md) | "Provides this skill provides a curated collection of... | theme factory, design... |
| [factory-explainer](../../skills/programming/factory-explainer/SKILL.md) | "Provides Explain Bitcoin Lightning channel factories and... | lightning factory explainer, blockchain... |
| [favicon](../../skills/programming/favicon/SKILL.md) | "Provides generate favicons from a source image... | favicon, uncategorized... |
| [feedback](../../skills/programming/feedback/SKILL.md) | "Provides Add loading, empty, error, and success feedback... | ux feedback, design... |
| [financial-modeling](../../skills/programming/financial-modeling/SKILL.md) | "Provides Build comprehensive 3-5 year financial models... | startup financial modeling, business... |
| [flow](../../skills/programming/flow/SKILL.md) | "Provides Design user flows and screen structure using... | ux flow, design... |
| [flow-architect](../../skills/programming/flow-architect/SKILL.md) | "Provides Build production-ready ReactFlow applications... | react flow architect, web... |
| [flow-cro](../../skills/programming/flow-cro/SKILL.md) | "Provides You are an expert in optimizing signup and... | signup flow cro, marketing... |
| [flow-node-ts](../../skills/programming/flow-node-ts/SKILL.md) | "Provides Create React Flow node components following... | react flow node ts, web... |
| [font](../../skills/programming/font/SKILL.md) | "CRITICAL: Use for Makepad font and text rendering.... | makepad font, development... |
| [food-safety-auditor](../../skills/programming/food-safety-auditor/SKILL.md) | "Provides Expert AI auditor for FDA Food Safety (FSMA),... | fda food safety auditor, legal... |
| [forensic-incident-response](../../skills/programming/forensic-incident-response/SKILL.md) | "Provides Investigate sudden drops in organic traffic or... | seo forensic incident response, content... |
| [foundations](../../skills/programming/foundations/SKILL.md) | "Provides apple human interface guidelines design... | hig foundations, development... |
| [framework-azure-ai-py](../../skills/programming/framework-azure-ai-py/SKILL.md) | Provides Build persistent agents on Azure AI Foundry using... | agent framework azure ai py, ai... |
| [frameworks](../../skills/programming/frameworks/SKILL.md) | "Provides Build robust, production-grade backtesting... | backtesting frameworks, business... |
| [frontend](../../skills/programming/frontend/SKILL.md) | "Provides Frontend development skill for React, Next.js,... | senior frontend, web... |
| [fullstack](../../skills/programming/fullstack/SKILL.md) | "Provides Complete toolkit for senior fullstack with modern... | senior fullstack, development... |
| [fundamentals](../../skills/programming/fundamentals/SKILL.md) | Provides Context is the complete state available to a... | context fundamentals, ai... |
| [fundamentals](../../skills/programming/fundamentals/SKILL.md) | "Provides Generative Engine Optimization for AI search... | geo fundamentals, marketing... |
| [fundamentals](../../skills/programming/fundamentals/SKILL.md) | "Provides Core principles of SEO including E-E-A-T, Core... | seo fundamentals, content... |
| [fundamentals](../../skills/programming/fundamentals/SKILL.md) | "Provides Three.js scene setup, cameras, renderer, Object3D... | threejs fundamentals, web... |
| [games](../../skills/programming/games/SKILL.md) | "Provides 2D game development principles. Sprites,... | 2d games, game... |
| [games](../../skills/programming/games/SKILL.md) | "Provides 3D game development principles. Rendering,... | 3d games, game... |
| [games](../../skills/programming/games/SKILL.md) | "Provides Mobile game development principles. Touch input,... | mobile games, game... |
| [games](../../skills/programming/games/SKILL.md) | "Provides PC and console game development principles.... | pc games, game... |
| [games](../../skills/programming/games/SKILL.md) | "Provides Web browser game development principles.... | web games, game... |
| [gate](../../skills/programming/gate/SKILL.md) | Provides Pre-ingestion verification for epistemic quality... | clarity gate, data... |
| [gated-debugging](../../skills/programming/gated-debugging/SKILL.md) | "Provides use when debugging any bug. enforces a 5-phase... | phase gated debugging, uncategorized... |
| [gates](../../skills/programming/gates/SKILL.md) | "Provides Agente que simula Bill Gates — cofundador da... | bill gates, uncategorized... |
| [gdscript-patterns](../../skills/programming/gdscript-patterns/SKILL.md) | "Provides Master Godot 4 GDScript patterns including... | godot gdscript patterns, game... |
| [generate](../../skills/programming/generate/SKILL.md) | Provides generate images and videos using fal.ai ai models... | fal generate, ai... |
| [generation](../../skills/programming/generation/SKILL.md) | "Provides Generate real audio narratives from text content... | podcast generation, uncategorized... |
| [generation-doc-generate](../../skills/programming/generation-doc-generate/SKILL.md) | "Provides You are a documentation expert specializing in... | documentation generation doc generate, content... |
| [generator-builder](../../skills/programming/generator-builder/SKILL.md) | "Provides Expert in building shareable generator tools that... | viral generator builder, marketing... |
| [geo](../../skills/programming/geo/SKILL.md) | "Provides Optimize content for AI Overviews, ChatGPT,... | seo geo, uncategorized... |
| [geometry](../../skills/programming/geometry/SKILL.md) | "Provides Three.js geometry creation - built-in shapes,... | threejs geometry, web... |
| [gif-creator](../../skills/programming/gif-creator/SKILL.md) | "Provides a toolkit providing utilities and knowledge for... | slack gif creator, uncategorized... |
| [gift](../../skills/programming/gift/SKILL.md) | "Provides Relationship-aware daily gift engine with... | daily gift, productivity... |
| [git-worktrees](../../skills/programming/git-worktrees/SKILL.md) | "Provides Git worktrees create isolated workspaces sharing... | using git worktrees, development... |
| [github](../../skills/programming/github/SKILL.md) | "Provides use the `gh` cli for issues, pull requests,... | github, uncategorized... |
| [godot-4-migration](../../skills/programming/godot-4-migration/SKILL.md) | "Provides Specialized guide for migrating Godot 3.x... | godot 4 migration, game... |
| [golang](../../skills/programming/golang/SKILL.md) | "Provides Guide for building reliable, fault-tolerant Go... | dbos golang, development... |
| [golang](../../skills/programming/golang/SKILL.md) | "Provides Build production-ready gRPC services in Go with... | grpc golang, development... |
| [gratitude](../../skills/programming/gratitude/SKILL.md) | Provides Multi-agent research skill for parallel research... | infinite gratitude, ai... |
| [guardian](../../skills/programming/guardian/SKILL.md) | Provides Guardiao de contexto que preserva dados criticos... | context guardian, ai... |
| [guidelines](../../skills/programming/guidelines/SKILL.md) | "Provides Write copy following Sentry brand guidelines. Use... | brand guidelines, marketing... |
| [guidelines-anthropic](../../skills/programming/guidelines-anthropic/SKILL.md) | "Provides To access Anthropic's official brand identity and... | brand guidelines anthropic, marketing... |
| [guidelines-community](../../skills/programming/guidelines-community/SKILL.md) | "Provides To access Anthropic's official brand identity and... | brand guidelines community, marketing... |
| [handling-patterns](../../skills/programming/handling-patterns/SKILL.md) | "Provides Build resilient applications with robust error... | error handling patterns, development... |
| [health-analyzer](../../skills/programming/health-analyzer/SKILL.md) | "Provides 分析家族病史、评估遗 传风险、识别家庭健康模式、提 供个性化预防建议 functionality... | family health analyzer, health... |
| [health-analyzer](../../skills/programming/health-analyzer/SKILL.md) | "Provides 分析心理健康数据、识 别心理模式、评估心理健康状况 、提供个性化心理健康建议。支... | mental health analyzer, health... |
| [health-analyzer](../../skills/programming/health-analyzer/SKILL.md) | "Provides 分析职业健康数据、识 别工作相关健康风险、评估职业 健康状况、提供个性化职业健康... | occupational health analyzer, health... |
| [health-analyzer](../../skills/programming/health-analyzer/SKILL.md) | "Provides 分析口腔健康数据、识 别口腔问题模式、评估口腔健康 状况、提供个性化口腔健康建议... | oral health analyzer, health... |
| [health-analyzer](../../skills/programming/health-analyzer/SKILL.md) | "Provides sexual health analyzer functionality and... | sexual health analyzer, health... |
| [health-analyzer](../../skills/programming/health-analyzer/SKILL.md) | Provides Analyze skin health data, identify skin problem... | skin health analyzer, health... |
| [health-analyzer](../../skills/programming/health-analyzer/SKILL.md) | "Provides 分析旅行健康数据、评 估目的地健康风险、提供疫苗接 种建议、生成多语言紧急医疗信... | travel health analyzer, health... |
| [hinton](../../skills/programming/hinton/SKILL.md) | "Provides Agente que simula Geoffrey Hinton — Godfather of... | geoffrey hinton, uncategorized... |
| [hr-payroll-setup](../../skills/programming/hr-payroll-setup/SKILL.md) | 'Provides Expert guide for Odoo HR and Payroll: salary... | odoo hr payroll setup, business... |
| [hreflang](../../skills/programming/hreflang/SKILL.md) | "Provides Hreflang and international SEO audit, validation,... | seo hreflang, uncategorized... |
| [hunter](../../skills/programming/hunter/SKILL.md) | "Provides Automatically hunt for high-impact OSS... | oss hunter, uncategorized... |
| [ia](../../skills/programming/ia/SKILL.md) | "Provides Especialista em leiloes judiciais e... | leiloeiro ia, leiloeiro... |
| [ideas](../../skills/programming/ideas/SKILL.md) | "Provides Provide proven marketing strategies and growth... | marketing ideas, marketing... |
| [image-edit](../../skills/programming/image-edit/SKILL.md) | Provides AI-powered image editing with style transfer and... | fal image edit, ai... |
| [image-gen](../../skills/programming/image-gen/SKILL.md) | "Provides Generate SEO-focused images such as OG cards,... | seo image gen, content... |
| [imagen](../../skills/programming/imagen/SKILL.md) | "Provides AI image generation skill powered by Google... | imagen, graphics... |
| [images](../../skills/programming/images/SKILL.md) | "Provides Image optimization analysis for SEO and... | seo images, uncategorized... |
| [impress](../../skills/programming/impress/SKILL.md) | "Provides Presentation creation, format conversion... | impress, presentation... |
| [in-chrome-troubleshooting](../../skills/programming/in-chrome-troubleshooting/SKILL.md) | Provides Diagnose and fix Claude in Chrome MCP extension... | claude in chrome troubleshooting, ai... |
| [index-tuning](../../skills/programming/index-tuning/SKILL.md) | Provides Optimize vector index performance for latency,... | vector index tuning, data... |
| [inputs](../../skills/programming/inputs/SKILL.md) | "Provides Check for .claude/apple-design-context.md before... | hig inputs, development... |
| [instagram](../../skills/programming/instagram/SKILL.md) | "Provides Integracao completa com Instagram via Graph API.... | instagram, marketing... |
| [interaction](../../skills/programming/interaction/SKILL.md) | "Provides Three.js interaction - raycasting, controls,... | threejs interaction, web... |
| [inventor](../../skills/programming/inventor/SKILL.md) | "Provides Product Inventor e Design Alchemist de nivel... | product inventor, business... |
| [inventory-optimizer](../../skills/programming/inventory-optimizer/SKILL.md) | 'Provides Expert guide for Odoo Inventory: stock valuation... | odoo inventory optimizer, business... |
| [issue-auditor](../../skills/programming/issue-auditor/SKILL.md) | "Provides High-level technical SEO and site architecture... | indexing issue auditor, growth... |
| [issue-creator](../../skills/programming/issue-creator/SKILL.md) | "Provides Turn error logs, screenshots, voice notes, and... | github issue creator, project... |
| [javascript-patterns](../../skills/programming/javascript-patterns/SKILL.md) | "Provides Comprehensive guide for mastering modern... | modern javascript patterns, development... |
| [jetpack-compose-expert](../../skills/programming/jetpack-compose-expert/SKILL.md) | "Provides Expert guidance for building modern Android UIs... | android jetpack compose expert, mobile... |
| [jobgpt](../../skills/programming/jobgpt/SKILL.md) | "Provides Job search automation, auto apply, resume... | jobgpt, uncategorized... |
| [jobs](../../skills/programming/jobs/SKILL.md) | "Provides Agente que simula Steve Jobs — cofundador da... | steve jobs, uncategorized... |
| [jq](../../skills/programming/jq/SKILL.md) | "Provides Expert jq usage for JSON querying, filtering,... | jq, development... |
| [js](../../skills/programming/js/SKILL.md) | "Provides Run Hugging Face models in JavaScript or... | transformers js, web... |
| [juridico](../../skills/programming/juridico/SKILL.md) | 'Provides Analise juridica de leiloes: nulidades, bem de... | leiloeiro juridico, leiloeiro... |
| [karpathy](../../skills/programming/karpathy/SKILL.md) | "Provides Agente que simula Andrej Karpathy — ex-Director... | andrej karpathy, ai... |
| [keyword-strategist](../../skills/programming/keyword-strategist/SKILL.md) | "Analyzes keyword usage in provided content, calculates... | seo keyword strategist, content... |
| [knowledge-extraction](../../skills/programming/knowledge-extraction/SKILL.md) | Provides Extract structured domain knowledge from AI models... | bdistill knowledge extraction, ai... |
| [l10n-compliance](../../skills/programming/l10n-compliance/SKILL.md) | 'Provides Country-specific Odoo localization: tax... | odoo l10n compliance, business... |
| [lab](../../skills/programming/lab/SKILL.md) | "Provides lab environment for claude superpowers... | superpowers lab, uncategorized... |
| [landscape](../../skills/programming/landscape/SKILL.md) | "Provides Comprehensive frameworks for analyzing... | competitive landscape, business... |
| [langfuse](../../skills/programming/langfuse/SKILL.md) | Provides Expert in Langfuse - the open-source LLM... | langfuse, uncategorized... |
| [last30days](../../skills/programming/last30days/SKILL.md) | "Provides Research a topic from the last 30 days on Reddit... | last30days, uncategorized... |
| [layout](../../skills/programming/layout/SKILL.md) | "CRITICAL: Use for Makepad layout system. Triggers on"... | makepad layout, development... |
| [layout-zafiro](../../skills/programming/layout-zafiro/SKILL.md) | "Provides Guidelines for modern Avalonia UI layout using... | avalonia layout zafiro, development... |
| [learn](../../skills/programming/learn/SKILL.md) | Provides Machine learning in Python with scikit-learn. Use... | scikit learn, ai... |
| [learning-ops-ml-pipeline](../../skills/programming/learning-ops-ml-pipeline/SKILL.md) | 'Provides design and implement a complete ml pipeline for:... | machine learning ops ml pipeline, uncategorized... |
| [lecun](../../skills/programming/lecun/SKILL.md) | "Provides Agente que simula Yann LeCun — inventor das... | yann lecun, ai... |
| [lecun-debate](../../skills/programming/lecun-debate/SKILL.md) | "Provides Sub-skill de debates e posições de Yann LeCun.... | yann lecun debate, ai... |
| [lecun-filosofia](../../skills/programming/lecun-filosofia/SKILL.md) | "Provides sub-skill filosófica e pedagógica de yann lecun... | yann lecun filosofia, ai... |
| [lecun-tecnico](../../skills/programming/lecun-tecnico/SKILL.md) | "Provides Sub-skill técnica de Yann LeCun. Cobre CNNs,... | yann lecun tecnico, ai... |
| [legal-seo-audit](../../skills/programming/legal-seo-audit/SKILL.md) | "Provides Audit and improve local SEO for law firms,... | local legal seo audit, marketing... |
| [lex](../../skills/programming/lex/SKILL.md) | "Provides Centralized 'Truth Engine' for... | lex, legal... |
| [library](../../skills/programming/library/SKILL.md) | "Provides Extensive icon library and AI-driven icon... | iconsax library, web... |
| [library](../../skills/programming/library/SKILL.md) | "Provides a comprehensive collection of battle-tested... | prompt library, content... |
| [lighting](../../skills/programming/lighting/SKILL.md) | "Provides Three.js lighting - light types, shadows,... | threejs lighting, web... |
| [like-socrates](../../skills/programming/like-socrates/SKILL.md) | "Explains concepts using Socratic-style dialogue. Use when... | explain like socrates, content... |
| [line-psychologist](../../skills/programming/line-psychologist/SKILL.md) | "Provides one sentence - what this skill does and when to... | subject line psychologist, uncategorized... |
| [linux](../../skills/programming/linux/SKILL.md) | "Provides Bash/Linux terminal patterns. Critical commands,... | bash linux, development... |
| [liquid-glass](../../skills/programming/liquid-glass/SKILL.md) | "Provides Implement or review SwiftUI Liquid Glass APIs... | swiftui liquid glass, mobile... |
| [llm-expert](../../skills/programming/llm-expert/SKILL.md) | Provides Master local LLM inference, model selection, VRAM... | local llm expert, data... |
| [loaders](../../skills/programming/loaders/SKILL.md) | "Provides Three.js asset loading - GLTF, textures, images,... | threejs loaders, web... |
| [localization](../../skills/programming/localization/SKILL.md) | "Provides Internationalization and localization patterns.... | i18n localization, development... |
| [loop](../../skills/programming/loop/SKILL.md) | "Teaches agents to iteratively build websites using Stitch... | stitch loop, uncategorized... |
| [macro-analyzer](../../skills/programming/macro-analyzer/SKILL.md) | "Provides Professional PESTEL/SWOT analysis agent based on... | kotler macro analyzer, business... |
| [magnets](../../skills/programming/magnets/SKILL.md) | "Provides Plan and optimize lead magnets for email capture... | lead magnets, uncategorized... |
| [makepad-animation](../../skills/programming/makepad-animation/SKILL.md) | Implements Makepad animation system patterns with... | makepad animation, makepad animator... |
| [management](../../skills/programming/management/SKILL.md) | "Provides Manage citations systematically throughout the... | citation management, content... |
| [management](../../skills/programming/management/SKILL.md) | "Provides Build efficient, scalable monorepos that enable... | monorepo management, development... |
| [management-context-restore](../../skills/programming/management-context-restore/SKILL.md) | Provides use when working with context management context... | context management context restore, ai... |
| [management-context-save](../../skills/programming/management-context-save/SKILL.md) | Provides use when working with context management context... | context management context save, ai... |
| [manager](../../skills/programming/manager/SKILL.md) | Provides Elite AI context engineering specialist mastering... | context manager, ai... |
| [manager](../../skills/programming/manager/SKILL.md) | "Provides Senior PM agent with 6 knowledge domains, 30+... | product manager, business... |
| [manager](../../skills/programming/manager/SKILL.md) | "Provides Monitor portfolio risk, R-multiples, and position... | risk manager, business... |
| [manager-hospital](../../skills/programming/manager-hospital/SKILL.md) | "Provides World-class Hospital IT Management Advisor... | it manager hospital, uncategorized... |
| [manager-pro](../../skills/programming/manager-pro/SKILL.md) | Provides Elite IT Management Advisor specializing in... | it manager pro, uncategorized... |
| [manager-toolkit](../../skills/programming/manager-toolkit/SKILL.md) | "Provides Essential tools and frameworks for modern product... | product manager toolkit, business... |
| [manifest](../../skills/programming/manifest/SKILL.md) | "Provides Install and configure the Manifest observability... | manifest, uncategorized... |
| [manufacturing-advisor](../../skills/programming/manufacturing-advisor/SKILL.md) | 'Provides Expert guide for Odoo Manufacturing: Bills of... | odoo manufacturing advisor, business... |
| [markdown](../../skills/programming/markdown/SKILL.md) | "Provides Create and edit Obsidian Flavored Markdown with... | obsidian markdown, uncategorized... |
| [marketer](../../skills/programming/marketer/SKILL.md) | Provides Elite content marketing strategist specializing in... | content marketer, content... |
| [marketing-context](../../skills/programming/marketing-context/SKILL.md) | "Provides Create or update a reusable product marketing... | product marketing context, business... |
| [markup](../../skills/programming/markup/SKILL.md) | Provides Design, validate, and optimize schema.org... | schema markup, marketing... |
| [mastery](../../skills/programming/mastery/SKILL.md) | "Provides 33+ essential JavaScript concepts every developer... | javascript mastery, development... |
| [materials](../../skills/programming/materials/SKILL.md) | "Provides Three.js materials - PBR, basic, phong, shader... | threejs materials, web... |
| [matplotlib](../../skills/programming/matplotlib/SKILL.md) | "Provides Matplotlib is Python's foundational visualization... | matplotlib, science... |
| [matrix-integration](../../skills/programming/matrix-integration/SKILL.md) | "CRITICAL: Use for Matrix SDK integration with Makepad.... | robius matrix integration, development... |
| [maxia](../../skills/programming/maxia/SKILL.md) | "Provides Connect to MAXIA AI-to-AI marketplace on Solana.... | maxia, uncategorized... |
| [mcp](../../skills/programming/mcp/SKILL.md) | Provides Connect to Helium's MCP server for news research,... | helium mcp, uncategorized... |
| [mcp-governance](../../skills/programming/mcp-governance/SKILL.md) | "Provides Agent governance skill for MCP tool calls — Cedar... | protect mcp governance, uncategorized... |
| [md](../../skills/programming/md/SKILL.md) | Provides this skill should be used when the user asks to... | agents md, ai... |
| [md](../../skills/programming/md/SKILL.md) | Provides Convert human-written CLAUDE.md into AI-native... | ai md, ai... |
| [md](../../skills/programming/md/SKILL.md) | "Provides Analyze Stitch projects and synthesize a semantic... | design md, design... |
| [md](../../skills/programming/md/SKILL.md) | 'Provides 6-layer AI governance: safety gates,... | yes md, uncategorized... |
| [medtech-compliance-auditor](../../skills/programming/medtech-compliance-auditor/SKILL.md) | "Provides Expert AI auditor for Medical Device (SaMD)... | fda medtech compliance auditor, legal... |
| [memory-mcp](../../skills/programming/memory-mcp/SKILL.md) | Provides a hybrid memory system that provides persistent,... | agent memory mcp, ai... |
| [mental-states](../../skills/programming/mental-states/SKILL.md) | Provides this skill should be used when the user asks to... | bdi mental states, ai... |
| [menubar-tuist-app](../../skills/programming/menubar-tuist-app/SKILL.md) | "Provides Build, refactor, or review SwiftUI macOS menubar... | macos menubar tuist app, uncategorized... |
| [mercado](../../skills/programming/mercado/SKILL.md) | "Provides Analise de mercado imobiliario para leiloes.... | leiloeiro mercado, leiloeiro... |
| [meta-optimizer](../../skills/programming/meta-optimizer/SKILL.md) | "Creates optimized meta titles, descriptions, and URL... | seo meta optimizer, content... |
| [metrics-calculation](../../skills/programming/metrics-calculation/SKILL.md) | "Provides Calculate portfolio risk metrics including VaR,... | risk metrics calculation, business... |
| [metrics-framework](../../skills/programming/metrics-framework/SKILL.md) | "Provides Comprehensive guide to tracking, calculating, and... | startup metrics framework, business... |
| [migration](../../skills/programming/migration/SKILL.md) | "Provides Master AngularJS to Angular migration, including... | angular migration, web... |
| [migration-code-migrate](../../skills/programming/migration-code-migrate/SKILL.md) | "Provides You are a code migration expert specializing in... | framework migration code migrate, development... |
| [migration-deps-upgrade](../../skills/programming/migration-deps-upgrade/SKILL.md) | "Provides You are a dependency management expert... | framework migration deps upgrade, development... |
| [migration-helper](../../skills/programming/migration-helper/SKILL.md) | "Provides Step-by-step guide for migrating Odoo custom... | odoo migration helper, business... |
| [migration-legacy-modernize](../../skills/programming/migration-legacy-modernize/SKILL.md) | "Provides Orchestrate a comprehensive legacy system... | framework migration legacy modernize, development... |
| [mini-app](../../skills/programming/mini-app/SKILL.md) | "Provides Expert in building Telegram Mini Apps (TWA) - web... | telegram mini app, uncategorized... |
| [mirror](../../skills/programming/mirror/SKILL.md) | "Provides one sentence - what this skill does and when to... | identity mirror, uncategorized... |
| [mobile-security-xss-scan](../../skills/programming/mobile-security-xss-scan/SKILL.md) | Provides You are a frontend security specialist focusing on... | frontend mobile security xss scan, web... |
| [mode](../../skills/programming/mode/SKILL.md) | 'Provides Version 2.35.0 | PRD to Production | Zero Human... | loki mode, ai... |
| [models-py](../../skills/programming/models-py/SKILL.md) | "Provides Create Pydantic models following the multi-model... | pydantic models py, development... |
| [modernization](../../skills/programming/modernization/SKILL.md) | "Provides Master React version upgrades, class to hooks... | react modernization, web... |
| [modernizer](../../skills/programming/modernizer/SKILL.md) | "Provides Refactor legacy codebases, migrate outdated... | legacy modernizer, development... |
| [module-developer](../../skills/programming/module-developer/SKILL.md) | "Provides Expert guide for creating custom Odoo modules.... | odoo module developer, business... |
| [molykit](../../skills/programming/molykit/SKILL.md) | "CRITICAL: Use for MolyKit AI chat toolkit. Triggers on"... | molykit, ai... |
| [monetization](../../skills/programming/monetization/SKILL.md) | "Provides Estrategia e implementacao de monetizacao para... | monetization, business... |
| [monitor](../../skills/programming/monitor/SKILL.md) | Provides Monitor de performance do Claude Code e sistema... | claude monitor, ai... |
| [moyu](../../skills/programming/moyu/SKILL.md) | "Anti-over-engineering guardrail that activates when an AI... | moyu, ai... |
| [multiplayer](../../skills/programming/multiplayer/SKILL.md) | "Provides Multiplayer game development principles.... | multiplayer, game... |
| [musk](../../skills/programming/musk/SKILL.md) | "Provides Agente que simula Elon Musk com profundidade... | elon musk, uncategorized... |
| [mvp-launcher](../../skills/programming/mvp-launcher/SKILL.md) | "Provides use when planning or building a saas mvp from... | saas mvp launcher, business... |
| [native-architecture](../../skills/programming/native-architecture/SKILL.md) | "Provides Production-ready patterns for React Native... | react native architecture, web... |
| [native-cli](../../skills/programming/native-cli/SKILL.md) | Provides Design spec with 98 rules for building CLI tools... | ai native cli, ai... |
| [native-ui](../../skills/programming/native-ui/SKILL.md) | "Provides Complete guide for building beautiful apps with... | building native ui, mobile... |
| [networkx](../../skills/programming/networkx/SKILL.md) | "Provides NetworkX is a Python package for creating,... | networkx, science... |
| [news-report](../../skills/programming/news-report/SKILL.md) | "Provides Scrapes content based on a preset URL list,... | daily news report, content... |
| [nonconformance](../../skills/programming/nonconformance/SKILL.md) | "Provides Codified expertise for quality control,... | quality nonconformance, business... |
| [notebooklm](../../skills/programming/notebooklm/SKILL.md) | Provides Interact with Google NotebookLM to query... | notebooklm, data... |
| [official](../../skills/programming/official/SKILL.md) | "Provides a user may ask you to create, edit, or analyze... | docx official, document... |
| [official](../../skills/programming/official/SKILL.md) | "Provides this guide covers essential pdf processing... | pdf official, document... |
| [official](../../skills/programming/official/SKILL.md) | "Provides a user may ask you to create, edit, or analyze... | pptx official, presentation... |
| [official](../../skills/programming/official/SKILL.md) | "Provides unless otherwise stated by the user or existing... | xlsx official, spreadsheet... |
| [on-windows](../../skills/programming/on-windows/SKILL.md) | "Provides How to use a Win32 build of BusyBox to run many... | busybox on windows, development... |
| [onboarding](../../skills/programming/onboarding/SKILL.md) | "Provides Generate two complementary onboarding documents... | wiki onboarding, content... |
| [ops](../../skills/programming/ops/SKILL.md) | Provides LLM Operations -- RAG, embeddings, vector... | llm ops, ai... |
| [optimization](../../skills/programming/optimization/SKILL.md) | Provides Context optimization extends the effective... | context optimization, ai... |
| [optimization](../../skills/programming/optimization/SKILL.md) | Provides Optimize Apache Spark jobs with partitioning,... | spark optimization, data... |
| [optimizer](../../skills/programming/optimizer/SKILL.md) | "Provides Developer Experience specialist. Improves... | dx optimizer, development... |
| [optimizer](../../skills/programming/optimizer/SKILL.md) | Provides Identifies and fixes performance bottlenecks in... | performance optimizer, development... |
| [option-ref](../../skills/programming/option-ref/SKILL.md) | Provides Quick reference for Option type. Use when user... | fp option ref, development... |
| [orchestration](../../skills/programming/orchestration/SKILL.md) | "Orchestrates design workflows by routing work through... | design orchestration, design... |
| [orchestration-improve-agent](../../skills/programming/orchestration-improve-agent/SKILL.md) | Provides Systematic improvement of existing agents through... | agent orchestration improve agent, ai... |
| [orchestration-multi-agent-optimize](../../skills/programming/orchestration-multi-agent-optimize/SKILL.md) | Provides Optimize multi-agent systems with coordinated... | agent orchestration multi agent optimize, ai... |
| [orchestrator](../../skills/programming/orchestrator/SKILL.md) | Provides Meta-skill que orquestra todos os agentes do... | agent orchestrator, ai... |
| [orchestrator](../../skills/programming/orchestrator/SKILL.md) | "Provides Orquestrador unificado de canais sociais —... | social orchestrator, marketing... |
| [organizer](../../skills/programming/organizer/SKILL.md) | 'Provides 6. Reduces Clutter: Identifies old files you... | file organizer, productivity... |
| [orm-expert](../../skills/programming/orm-expert/SKILL.md) | 'Provides Master Odoo ORM patterns: search, browse, create,... | odoo orm expert, business... |
| [os](../../skills/programming/os/SKILL.md) | "Provides Five-phase pipeline (triage → clarify → research ... | idea os, product... |
| [package-manager](../../skills/programming/package-manager/SKILL.md) | "Provides Comprehensive guide to using uv, an extremely... | uv package manager, development... |
| [packaging](../../skills/programming/packaging/SKILL.md) | "Provides Comprehensive guide to creating, structuring, and... | python packaging, development... |
| [page](../../skills/programming/page/SKILL.md) | "Provides Deep single-page SEO analysis covering on-page... | seo page, uncategorized... |
| [page](../../skills/programming/page/SKILL.md) | "Provides Scaffold a new mobile-first page using StyleSeed... | ui page, design... |
| [page-writer](../../skills/programming/page-writer/SKILL.md) | "Provides You are a senior documentation engineer that... | wiki page writer, content... |
| [paper-conversion](../../skills/programming/paper-conversion/SKILL.md) | "Provides this skill should be used when the user asks to... | latex paper conversion, uncategorized... |
| [pattern](../../skills/programming/pattern/SKILL.md) | "Provides Generate reusable UI patterns such as card... | ui pattern, design... |
| [patterns](../../skills/programming/patterns/SKILL.md) | "Provides Apple Human Interface Guidelines interaction and... | hig patterns, development... |
| [patterns](../../skills/programming/patterns/SKILL.md) | Provides Production patterns for Linkerd service mesh - the... | linkerd patterns, uncategorized... |
| [patterns](../../skills/programming/patterns/SKILL.md) | "Provides Python development principles and... | python patterns, development... |
| [perception-psychologist](../../skills/programming/perception-psychologist/SKILL.md) | "Provides one sentence - what this skill does and when to... | brand perception psychologist, uncategorized... |
| [performance-audit](../../skills/programming/performance-audit/SKILL.md) | Provides Audit SwiftUI performance issues from code review... | swiftui performance audit, mobile... |
| [performance-optimization](../../skills/programming/performance-optimization/SKILL.md) | Provides Profile and optimize Python code using cProfile,... | python performance optimization, development... |
| [performance-tuner](../../skills/programming/performance-tuner/SKILL.md) | 'Provides Expert guide for diagnosing and fixing Odoo... | odoo performance tuner, business... |
| [persuasion-engineer](../../skills/programming/persuasion-engineer/SKILL.md) | "Provides one sentence - what this skill does and when to... | ux persuasion engineer, uncategorized... |
| [pipe-ref](../../skills/programming/pipe-ref/SKILL.md) | Provides Quick reference for pipe and flow. Use when user... | fp pipe ref, development... |
| [plan](../../skills/programming/plan/SKILL.md) | "Provides Strategic SEO planning for new or existing... | seo plan, content... |
| [platform](../../skills/programming/platform/SKILL.md) | Provides Platform APIs for model management, pricing, and... | fal platform, ai... |
| [platform](../../skills/programming/platform/SKILL.md) | "CRITICAL: Use for Makepad cross-platform support. Triggers... | makepad platform, development... |
| [platform-apps-multi-platform](../../skills/programming/platform-apps-multi-platform/SKILL.md) | "Provides Build and deploy the same feature consistently... | multi platform apps multi platform, development... |
| [platforms](../../skills/programming/platforms/SKILL.md) | "Provides Apple Human Interface Guidelines for... | hig platforms, development... |
| [plotly](../../skills/programming/plotly/SKILL.md) | Provides Interactive visualization library. Use when you... | plotly, data... |
| [polars](../../skills/programming/polars/SKILL.md) | Provides Fast in-memory DataFrame library for datasets that... | polars, data... |
| [post-writer-seo](../../skills/programming/post-writer-seo/SKILL.md) | "Provides Social Media Strategist and Content Writer.... | social post writer seo, growth... |
| [postprocessing](../../skills/programming/postprocessing/SKILL.md) | "Provides Three.js post-processing - EffectComposer, bloom,... | threejs postprocessing, web... |
| [ppt-skills](../../skills/programming/ppt-skills/SKILL.md) | "Provides AI-powered PPT generation with document analysis... | nanobanana ppt skills, presentation... |
| [pptx-generator](../../skills/programming/pptx-generator/SKILL.md) | "Provides Generate complete Python scripts that build... | python pptx generator, development... |
| [pragmatic](../../skills/programming/pragmatic/SKILL.md) | "Provides a practical, jargon-free guide to functional... | fp pragmatic, development... |
| [preemptor](../../skills/programming/preemptor/SKILL.md) | "Provides one sentence - what this skill does and when to... | objection preemptor, uncategorized... |
| [prevention](../../skills/programming/prevention/SKILL.md) | "Provides Reduce voluntary and involuntary churn with... | churn prevention, uncategorized... |
| [principles](../../skills/programming/principles/SKILL.md) | "Provides Evaluate interfaces against 168 research-backed... | uxui principles, design... |
| [pro](../../skills/programming/pro/SKILL.md) | "Master of defensive Bash scripting for production... | bash pro, development... |
| [pro](../../skills/programming/pro/SKILL.md) | "Provides Professional, ethical HR partner for hiring,... | hr pro, business... |
| [pro](../../skills/programming/pro/SKILL.md) | Provides Master modern SQL with cloud-native databases,... | sql pro, data... |
| [procurement](../../skills/programming/procurement/SKILL.md) | "Provides Codified expertise for electricity and gas... | energy procurement, business... |
| [product](../../skills/programming/product/SKILL.md) | Provides Every product will be AI-powered. The question is... | ai product, ai... |
| [product](../../skills/programming/product/SKILL.md) | "Provides Analytics de produto — PostHog, Mixpanel,... | analytics product, data... |
| [productivity](../../skills/programming/productivity/SKILL.md) | "Provides Office productivity workflow covering document... | office productivity, productivity... |
| [profile-optimizer](../../skills/programming/profile-optimizer/SKILL.md) | "Provides High-intent expert for LinkedIn profile checks,... | linkedin profile optimizer, growth... |
| [profiling](../../skills/programming/profiling/SKILL.md) | Provides Performance profiling principles. Measurement,... | performance profiling, development... |
| [program](../../skills/programming/program/SKILL.md) | Provides You are an expert in viral growth and referral... | referral program, marketing... |
| [programmatic](../../skills/programming/programmatic/SKILL.md) | Provides Plan and audit programmatic SEO pages generated at... | seo programmatic, uncategorized... |
| [programming-glsl](../../skills/programming/programming-glsl/SKILL.md) | "Provides Expert guide for writing efficient GLSL shaders... | shader programming glsl, uncategorized... |
| [programming-rust-project](../../skills/programming/programming-rust-project/SKILL.md) | "Provides You are a Rust project architecture expert... | systems programming rust project, development... |
| [project-context](../../skills/programming/project-context/SKILL.md) | "Provides Create or update a shared Apple design context... | hig project context, development... |
| [project-organizer](../../skills/programming/project-organizer/SKILL.md) | "Provides Take a list of projects and their related... | sred project organizer, project... |
| [project-timesheet](../../skills/programming/project-timesheet/SKILL.md) | 'Provides Expert guide for Odoo Project and Timesheets:... | odoo project timesheet, business... |
| [prompt](../../skills/programming/prompt/SKILL.md) | "Transforms vague UI ideas into polished, Stitch-optimized... | enhance prompt, web... |
| [prompt-optimizer](../../skills/programming/prompt-optimizer/SKILL.md) | Provides use when improving prompts for any llm. applies... | llm prompt optimizer, ai... |
| [proof-architect](../../skills/programming/proof-architect/SKILL.md) | "Provides one sentence - what this skill does and when to... | social proof architect, uncategorized... |
| [proofreader](../../skills/programming/proofreader/SKILL.md) | "Provides use when a user asks to functionality and... | professional proofreader, content... |
| [prose](../../skills/programming/prose/SKILL.md) | "Provides a hard-edged writing style contract for timeless,... | beautiful prose, content... |
| [protocol-templates](../../skills/programming/protocol-templates/SKILL.md) | "Provides Implement DeFi protocols with production-ready... | defi protocol templates, blockchain... |
| [psychographic-profiler](../../skills/programming/psychographic-profiler/SKILL.md) | "Provides one sentence - what this skill does and when to... | customer psychographic profiler, uncategorized... |
| [psychologist](../../skills/programming/psychologist/SKILL.md) | "Provides one sentence - what this skill does and when to... | copywriting psychologist, content... |
| [psychologist](../../skills/programming/psychologist/SKILL.md) | "Provides one sentence - what this skill does and when to... | headline psychologist, uncategorized... |
| [psychologist](../../skills/programming/psychologist/SKILL.md) | "Provides one sentence - what this skill does and when to... | onboarding psychologist, uncategorized... |
| [psychologist](../../skills/programming/psychologist/SKILL.md) | "Provides one sentence - what this skill does and when to... | pitch psychologist, uncategorized... |
| [psychologist](../../skills/programming/psychologist/SKILL.md) | "Provides one sentence - what this skill does and when to... | sequence psychologist, uncategorized... |
| [psychology](../../skills/programming/psychology/SKILL.md) | "Provides Apply behavioral science and mental models to... | marketing psychology, marketing... |
| [psychology-strategist](../../skills/programming/psychology-strategist/SKILL.md) | "Provides one sentence - what this skill does and when to... | price psychology strategist, uncategorized... |
| [purchase-workflow](../../skills/programming/purchase-workflow/SKILL.md) | "Provides Expert guide for Odoo Purchase: RFQ → PO →... | odoo purchase workflow, business... |
| [python](../../skills/programming/python/SKILL.md) | "Provides Guide for building reliable, fault-tolerant... | dbos python, development... |
| [python-patterns](../../skills/programming/python-patterns/SKILL.md) | "Provides Comprehensive guidance for implementing... | async python patterns, development... |
| [qa](../../skills/programming/qa/SKILL.md) | "Provides Answer repository questions grounded entirely in... | wiki qa, content... |
| [qiskit](../../skills/programming/qiskit/SKILL.md) | "Provides Qiskit is the world's most popular open-source... | qiskit, science... |
| [quality-frameworks](../../skills/programming/quality-frameworks/SKILL.md) | "Provides Implement data quality validation with Great... | data quality frameworks, data... |
| [qweb-templates](../../skills/programming/qweb-templates/SKILL.md) | "Provides Expert in Odoo QWeb templating for PDF reports,... | odoo qweb templates, business... |
| [rails-project](../../skills/programming/rails-project/SKILL.md) | "Provides create a new rails project functionality and... | new rails project, uncategorized... |
| [react](../../skills/programming/react/SKILL.md) | Provides Practical patterns for using fp-ts with React -... | fp react, development... |
| [readme](../../skills/programming/readme/SKILL.md) | "Provides You are an expert technical writer creating... | readme, content... |
| [refactor](../../skills/programming/refactor/SKILL.md) | "Provides Comprehensive guide for refactoring imperative... | fp refactor, development... |
| [refactoring-context-restore](../../skills/programming/refactoring-context-restore/SKILL.md) | Provides use when working with code refactoring context... | code refactoring context restore, development... |
| [refactoring-tech-debt](../../skills/programming/refactoring-tech-debt/SKILL.md) | Provides You are a technical debt expert specializing in... | code refactoring tech debt, development... |
| [reference](../../skills/programming/reference/SKILL.md) | "Provides this category provides reference materials for... | makepad reference, development... |
| [relationship-management](../../skills/programming/relationship-management/SKILL.md) | "Provides Codified expertise for managing carrier... | carrier relationship management, business... |
| [remotion](../../skills/programming/remotion/SKILL.md) | "Provides Generate walkthrough videos from Stitch projects... | remotion, media... |
| [research](../../skills/programming/research/SKILL.md) | Provides Run autonomous research tasks that plan, search,... | deep research, ai... |
| [researcher](../../skills/programming/researcher/SKILL.md) | "Provides You are an expert software engineer and systems... | wiki researcher, content... |
| [reverse-logistics](../../skills/programming/reverse-logistics/SKILL.md) | "Provides Codified expertise for returns authorisation,... | returns reverse logistics, business... |
| [review](../../skills/programming/review/SKILL.md) | "Provides Review UI code for StyleSeed design-system... | ui review, design... |
| [review-ai-ai-review](../../skills/programming/review-ai-ai-review/SKILL.md) | "Provides You are an expert AI-powered code review... | code review ai ai review, development... |
| [review-excellence](../../skills/programming/review-excellence/SKILL.md) | "Provides Transform code reviews from gatekeeping to... | code review excellence, development... |
| [reviewer](../../skills/programming/reviewer/SKILL.md) | "Provides Elite code review expert specializing in modern... | code reviewer, development... |
| [revops](../../skills/programming/revops/SKILL.md) | "Provides Design and improve revenue operations, lead... | revops, business... |
| [risco](../../skills/programming/risco/SKILL.md) | "Provides Analise de risco em leiloes de imoveis. Score 36... | leiloeiro risco, leiloeiro... |
| [rod-master](../../skills/programming/rod-master/SKILL.md) | "Provides Comprehensive guide for browser automation and... | go rod master, development... |
| [rpc-api](../../skills/programming/rpc-api/SKILL.md) | "Provides Expert on Odoo's external JSON-RPC and XML-RPC... | odoo rpc api, business... |
| [saas-launcher](../../skills/programming/saas-launcher/SKILL.md) | "Provides Expert in launching small, focused SaaS products... | micro saas launcher, business... |
| [safety-patterns](../../skills/programming/safety-patterns/SKILL.md) | "Provides Cross-language patterns for memory-safe... | memory safety patterns, development... |
| [sales-crm-expert](../../skills/programming/sales-crm-expert/SKILL.md) | 'Provides Expert guide for Odoo Sales and CRM: pipeline... | odoo sales crm expert, business... |
| [satori](../../skills/programming/satori/SKILL.md) | "Provides Clinically informed wisdom companion blending... | satori, personal... |
| [scanpy](../../skills/programming/scanpy/SKILL.md) | Provides Scanpy is a scalable Python toolkit for analyzing... | scanpy, science... |
| [scheduling](../../skills/programming/scheduling/SKILL.md) | "Provides Codified expertise for production scheduling, job... | production scheduling, business... |
| [schema](../../skills/programming/schema/SKILL.md) | "Detect, validate, and generate Schema.org structured data.... | seo schema, uncategorized... |
| [scientific-skills](../../skills/programming/scientific-skills/SKILL.md) | Provides scientific research and analysis skills... | claude scientific skills, ai... |
| [scientist](../../skills/programming/scientist/SKILL.md) | Provides Expert data scientist for advanced analytics,... | data scientist, data... |
| [scraper](../../skills/programming/scraper/SKILL.md) | Provides Deep web scraping, screenshots, PDF parsing, and... | firecrawl scraper, data... |
| [scraper](../../skills/programming/scraper/SKILL.md) | Provides Web scraping inteligente multi-estrategia. Extrai... | web scraper, data... |
| [screenshots](../../skills/programming/screenshots/SKILL.md) | "Provides Generate marketing screenshots of your app using... | screenshots, marketing... |
| [seaborn](../../skills/programming/seaborn/SKILL.md) | Provides Seaborn is a Python visualization library for... | seaborn, science... |
| [search](../../skills/programming/search/SKILL.md) | Provides Semantic search, similar content discovery, and... | exa search, data... |
| [search-implementation](../../skills/programming/search-implementation/SKILL.md) | Provides Combine vector and keyword search for improved... | hybrid search implementation, ai... |
| [search-patterns](../../skills/programming/search-patterns/SKILL.md) | Provides Implement efficient similarity search with vector... | similarity search patterns, data... |
| [security-coder](../../skills/programming/security-coder/SKILL.md) | Provides Expert in secure mobile coding practices... | mobile security coder, mobile... |
| [security-rules](../../skills/programming/security-rules/SKILL.md) | 'Provides Expert in Odoo access control:... | odoo security rules, business... |
| [seo](../../skills/programming/seo/SKILL.md) | Provides Optimize content for AI search and LLM citations... | ai seo, ai... |
| [seo](../../skills/programming/seo/SKILL.md) | Provides Design and evaluate programmatic SEO strategies... | programmatic seo, marketing... |
| [seo](../../skills/programming/seo/SKILL.md) | "Provides Run a broad SEO audit across technical SEO,... | seo, content... |
| [sequence](../../skills/programming/sequence/SKILL.md) | "Provides You are an expert in email marketing and... | email sequence, marketing... |
| [settings-audit](../../skills/programming/settings-audit/SKILL.md) | Provides Analyze a repository to generate recommended... | claude settings audit, ai... |
| [setup](../../skills/programming/setup/SKILL.md) | "Creates devcontainers with Claude Code, language-specific... | devcontainer setup, development... |
| [setup](../../skills/programming/setup/SKILL.md) | "Provides Interactive StyleSeed setup wizard for choosing... | ui setup, design... |
| [setup-guide](../../skills/programming/setup-guide/SKILL.md) | "Provides Guide developers through setting up development... | environment setup guide, development... |
| [shaders](../../skills/programming/shaders/SKILL.md) | "CRITICAL: Use for Makepad shader system. Triggers on"... | makepad shaders, development... |
| [shaders](../../skills/programming/shaders/SKILL.md) | "Provides Three.js shaders - GLSL, ShaderMaterial,... | threejs shaders, web... |
| [sheets-automation](../../skills/programming/sheets-automation/SKILL.md) | "Provides Lightweight Google Sheets integration with... | google sheets automation, spreadsheet... |
| [shell-pro](../../skills/programming/shell-pro/SKILL.md) | "Provides Expert in strict POSIX sh scripting for maximum... | posix shell pro, uncategorized... |
| [shell-reliability](../../skills/programming/shell-reliability/SKILL.md) | 'Provides Reliable command execution on Windows: paths,... | windows shell reliability, uncategorized... |
| [shell-scripting](../../skills/programming/shell-scripting/SKILL.md) | "Provides Provide production-ready shell script templates... | linux shell scripting, development... |
| [shopify-integration](../../skills/programming/shopify-integration/SKILL.md) | 'Provides Connect Odoo with Shopify: sync products,... | odoo shopify integration, business... |
| [simplifier](../../skills/programming/simplifier/SKILL.md) | "Provides Simplifies and refines code for clarity,... | code simplifier, development... |
| [sitemap](../../skills/programming/sitemap/SKILL.md) | "Provides Analyze existing XML sitemaps or generate new... | seo sitemap, uncategorized... |
| [sizing-analysis](../../skills/programming/sizing-analysis/SKILL.md) | "Provides Comprehensive market sizing methodologies for... | market sizing analysis, business... |
| [skill-audit](../../skills/programming/skill-audit/SKILL.md) | "Provides Audit a project and recommend the highest-value... | project skill audit, uncategorized... |
| [skills](../../skills/programming/skills/SKILL.md) | 'Provides Makepad UI development skills for Rust apps:... | makepad skills, development... |
| [skills](../../skills/programming/skills/SKILL.md) | Provides Discover, list, create, edit, toggle, copy, move,... | manage skills, ai... |
| [skills](../../skills/programming/skills/SKILL.md) | "Provides Create 3D scenes, interactive experiences, and... | threejs skills, web... |
| [skills](../../skills/programming/skills/SKILL.md) | Provides Opinionated, evolving constraints to guide agents... | ui skills, ai... |
| [skills](../../skills/programming/skills/SKILL.md) | "Provides Upload, stream, search, edit, transcribe, and... | videodb skills, media... |
| [slides](../../skills/programming/slides/SKILL.md) | "Provides Create stunning, animation-rich HTML... | frontend slides, presentation... |
| [slides-automation](../../skills/programming/slides-automation/SKILL.md) | "Provides Lightweight Google Slides integration with... | google slides automation, presentation... |
| [snippet-hunter](../../skills/programming/snippet-hunter/SKILL.md) | "Provides Formats content to be eligible for featured... | seo snippet hunter, content... |
| [specialist](../../skills/programming/specialist/SKILL.md) | "Provides expert web researcher using advanced search... | search specialist, content... |
| [speed](../../skills/programming/speed/SKILL.md) | Provides launch rsvp speed reader for text functionality... | speed, uncategorized... |
| [speed-reader](../../skills/programming/speed-reader/SKILL.md) | Provides -Speed read Claude's responses at 600+ WPM using... | claude speed reader, ai... |
| [spells](../../skills/programming/spells/SKILL.md) | "Provides curated micro-interactions and design details... | design spells, design... |
| [splash](../../skills/programming/splash/SKILL.md) | "CRITICAL: Use for Makepad Splash scripting language.... | makepad splash, development... |
| [spm-app-packaging](../../skills/programming/spm-app-packaging/SKILL.md) | "Provides Scaffold, build, sign, and package SwiftPM macOS... | macos spm app packaging, uncategorized... |
| [stage-mapper](../../skills/programming/stage-mapper/SKILL.md) | "Provides one sentence - what this skill does and when to... | awareness stage mapper, uncategorized... |
| [standards](../../skills/programming/standards/SKILL.md) | Provides Master ERC-721 and ERC-1155 NFT standards,... | nft standards, uncategorized... |
| [state-management](../../skills/programming/state-management/SKILL.md) | "Provides Master modern Angular state management with... | angular state management, web... |
| [state-management](../../skills/programming/state-management/SKILL.md) | "Provides Master modern React state management with Redux... | react state management, web... |
| [state-management](../../skills/programming/state-management/SKILL.md) | ''CRITICAL: Use for Robius state management patterns.... | robius state management, robius-state-management... |
| [statsmodels](../../skills/programming/statsmodels/SKILL.md) | "Provides Statsmodels is Python's premier library for... | statsmodels, science... |
| [stock-research](../../skills/programming/stock-research/SKILL.md) | Provides Thesis-driven equity analysis from public SEC... | xvary stock research, uncategorized... |
| [store-changelog](../../skills/programming/store-changelog/SKILL.md) | "Provides Generate user-facing App Store release notes from... | app store changelog, uncategorized... |
| [store-optimization](../../skills/programming/store-optimization/SKILL.md) | "Provides Complete App Store Optimization (ASO) toolkit for... | app store optimization, marketing... |
| [storytelling](../../skills/programming/storytelling/SKILL.md) | Provides Transform raw data into compelling narratives that... | data storytelling, data... |
| [strategies](../../skills/programming/strategies/SKILL.md) | Provides Guide to selecting and optimizing embedding models... | embedding strategies, data... |
| [strategy](../../skills/programming/strategy/SKILL.md) | "Provides Plan a content strategy, topic clusters,... | content strategy, uncategorized... |
| [strategy](../../skills/programming/strategy/SKILL.md) | "Provides You are an expert in SaaS product launches and... | launch strategy, marketing... |
| [strategy](../../skills/programming/strategy/SKILL.md) | "Provides Design pricing, packaging, and monetization... | pricing strategy, business... |
| [structure-architect](../../skills/programming/structure-architect/SKILL.md) | "Analyzes and optimizes content structure including header... | seo structure architect, content... |
| [structure-protocol](../../skills/programming/structure-protocol/SKILL.md) | "Provides Give agents persistent structural memory of a... | data structure protocol, data... |
| [structured-output](../../skills/programming/structured-output/SKILL.md) | "Get reliable JSON, enums, and typed objects from LLMs... | llm structured output, ai... |
| [studio](../../skills/programming/studio/SKILL.md) | "Provides Studio de geracao de imagens inteligente —... | image studio, graphics... |
| [studio-image](../../skills/programming/studio-image/SKILL.md) | Provides Geracao de imagens humanizadas via Google AI... | ai studio image, ai... |
| [summarizer](../../skills/programming/summarizer/SKILL.md) | "Provides Extract transcripts from YouTube videos and... | youtube summarizer, content... |
| [supabase-auth](../../skills/programming/supabase-auth/SKILL.md) | "Provides expert integration of supabase auth with next.js... | nextjs supabase auth, uncategorized... |
| [support](../../skills/programming/support/SKILL.md) | "Provides Elite AI-powered customer support specialist... | customer support, business... |
| [sutskever](../../skills/programming/sutskever/SKILL.md) | "Provides Agente que simula Ilya Sutskever — co-fundador da... | ilya sutskever, ai... |
| [sympy](../../skills/programming/sympy/SKILL.md) | "Provides SymPy is a Python library for symbolic... | sympy, science... |
| [systems](../../skills/programming/systems/SKILL.md) | "Provides Email has the highest ROI of any marketing... | email systems, uncategorized... |
| [tailwind-setup](../../skills/programming/tailwind-setup/SKILL.md) | "Provides Set up Tailwind CSS v4 in Expo with... | expo tailwind setup, mobile... |
| [tao](../../skills/programming/tao/SKILL.md) | "Provides Matemático ultra-avançado inspirado em Terence... | matematico tao, uncategorized... |
| [taskeither-ref](../../skills/programming/taskeither-ref/SKILL.md) | "Provides Quick reference for TaskEither. Use when user... | fp taskeither ref, development... |
| [tech](../../skills/programming/tech/SKILL.md) | Provides Integrate multiple digital health data sources,... | wellally tech, uncategorized... |
| [technical](../../skills/programming/technical/SKILL.md) | "Provides Audit technical SEO across crawlability,... | seo technical, web... |
| [technologies](../../skills/programming/technologies/SKILL.md) | "Provides Check for .claude/apple-design-context.md before... | hig technologies, development... |
| [template-business](../../skills/programming/template-business/SKILL.md) | "Provides Expert in building and selling Notion templates... | notion template business, business... |
| [templates](../../skills/programming/templates/SKILL.md) | "Provides Documentation templates and structure guidelines.... | documentation templates, content... |
| [test-setup](../../skills/programming/test-setup/SKILL.md) | "Provides Structured guide for setting up A/B tests with... | ab test setup, marketing... |
| [testing](../../skills/programming/testing/SKILL.md) | Provides Master comprehensive testing strategies for smart... | web3 testing, blockchain... |
| [testing-patterns](../../skills/programming/testing-patterns/SKILL.md) | Provides Comprehensive guide for implementing robust... | javascript testing patterns, development... |
| [testing-patterns](../../skills/programming/testing-patterns/SKILL.md) | Provides Implement comprehensive testing strategies with... | python testing patterns, development... |
| [testing-review-ai-review](../../skills/programming/testing-review-ai-review/SKILL.md) | Provides You are an expert AI-powered code review... | performance testing review ai review, development... |
| [testing-review-multi-agent-review](../../skills/programming/testing-review-multi-agent-review/SKILL.md) | Provides use when working with performance testing review... | performance testing review multi agent review, development... |
| [textures](../../skills/programming/textures/SKILL.md) | "Provides Three.js textures - texture types, UV mapping,... | threejs textures, web... |
| [tmux](../../skills/programming/tmux/SKILL.md) | "Provides Expert tmux session, window, and pane management... | tmux, development... |
| [to-be-done-analyst](../../skills/programming/to-be-done-analyst/SKILL.md) | "Provides one sentence - what this skill does and when to... | jobs to be done analyst, uncategorized... |
| [to-wordpress-converter](../../skills/programming/to-wordpress-converter/SKILL.md) | "Provides Expert skill for converting any codebase... | codebase to wordpress converter, development... |
| [tokens](../../skills/programming/tokens/SKILL.md) | "Provides List, add, and update StyleSeed design tokens... | ui tokens, design... |
| [tool-builder](../../skills/programming/tool-builder/SKILL.md) | Provides Tools are how AI agents interact with the world. A... | agent tool builder, ai... |
| [tool-builder](../../skills/programming/tool-builder/SKILL.md) | "Provides Expert in building custom tools that solve your... | personal tool builder, uncategorized... |
| [tool-strategy](../../skills/programming/tool-strategy/SKILL.md) | "Provides You are an expert in engineering-as-marketing... | free tool strategy, marketing... |
| [toolkit-smart-debug](../../skills/programming/toolkit-smart-debug/SKILL.md) | "Provides use when working with debugging toolkit smart... | debugging toolkit smart debug, development... |
| [tracking](../../skills/programming/tracking/SKILL.md) | Provides Design, audit, and improve analytics tracking... | analytics tracking, data... |
| [trade-compliance](../../skills/programming/trade-compliance/SKILL.md) | "Provides Codified expertise for customs documentation,... | customs trade compliance, legal... |
| [transformation-patterns](../../skills/programming/transformation-patterns/SKILL.md) | "Provides Production-ready patterns for dbt (data build... | dbt transformation patterns, data... |
| [trend-analyzer](../../skills/programming/trend-analyzer/SKILL.md) | "Provides 分析一段时间内健康数 据的趋势和模式。关联药物、症 状、生命体征、化验结果和其他... | health trend analyzer, health... |
| [trust-metadata](../../skills/programming/trust-metadata/SKILL.md) | "Provides the ai native file format. exif for ai — stamps... | akf trust metadata, uncategorized... |
| [ts-errors](../../skills/programming/ts-errors/SKILL.md) | "Provides Handle errors as values using fp-ts Either and... | fp ts errors, development... |
| [ts-pragmatic](../../skills/programming/ts-pragmatic/SKILL.md) | "Provides a practical, jargon-free guide to fp-ts... | fp ts pragmatic, development... |
| [ts-react](../../skills/programming/ts-react/SKILL.md) | Provides Practical patterns for using fp-ts with React -... | fp ts react, development... |
| [twitter-scraper](../../skills/programming/twitter-scraper/SKILL.md) | "Provides X (Twitter) data platform skill — tweet search,... | x twitter scraper, data... |
| [types-ref](../../skills/programming/types-ref/SKILL.md) | "Provides Quick reference for fp-ts types. Use when user... | fp types ref, development... |
| [typescript](../../skills/programming/typescript/SKILL.md) | "Provides Guide for building reliable, fault-tolerant... | dbos typescript, development... |
| [ui](../../skills/programming/ui/SKILL.md) | "Validates animation durations, enforces typography scale,... | baseline ui, web... |
| [ui-dark-ts](../../skills/programming/ui-dark-ts/SKILL.md) | Provides a modern dark-themed react ui system using... | frontend ui dark ts, web... |
| [ui-design](../../skills/programming/ui-design/SKILL.md) | "Provides Expert guidance for crafting effective prompts in... | stitch ui design, design... |
| [ui-design-system](../../skills/programming/ui-design-system/SKILL.md) | "Provides Build accessible design systems with Radix UI... | radix ui design system, web... |
| [ui-generator](../../skills/programming/ui-generator/SKILL.md) | "Provides Utilizes Magic by 21st.dev to generate, compare,... | magic ui generator, web... |
| [ui-jetpack-compose](../../skills/programming/ui-jetpack-compose/SKILL.md) | "Provides expo-ui-jetpack-compose functionality and... | expo ui jetpack compose, mobile... |
| [ui-patterns](../../skills/programming/ui-patterns/SKILL.md) | Provides Modern Angular UI patterns for loading states,... | angular ui patterns, web... |
| [ui-patterns](../../skills/programming/ui-patterns/SKILL.md) | Provides Modern React UI patterns for loading states, error... | react ui patterns, web... |
| [ui-patterns](../../skills/programming/ui-patterns/SKILL.md) | "Provides Apply proven SwiftUI UI patterns for navigation,... | swiftui ui patterns, mobile... |
| [ui-swift-ui](../../skills/programming/ui-swift-ui/SKILL.md) | "Provides expo-ui-swift-ui functionality and capabilities." | expo ui swift ui, mobile... |
| [updater](../../skills/programming/updater/SKILL.md) | "Provides speckit safe update functionality and... | speckit updater, uncategorized... |
| [upgrade](../../skills/programming/upgrade/SKILL.md) | "Provides Master major dependency version upgrades,... | dependency upgrade, development... |
| [upgrade-advisor](../../skills/programming/upgrade-advisor/SKILL.md) | 'Provides Step-by-step Odoo version upgrade advisor:... | odoo upgrade advisor, business... |
| [upgrade-cro](../../skills/programming/upgrade-cro/SKILL.md) | "Provides You are an expert in in-app paywalls and upgrade... | paywall upgrade cro, marketing... |
| [upscale](../../skills/programming/upscale/SKILL.md) | Provides upscale and enhance image and video resolution... | fal upscale, ai... |
| [urgency-psychologist](../../skills/programming/urgency-psychologist/SKILL.md) | "Provides one sentence - what this skill does and when to... | scarcity urgency psychologist, uncategorized... |
| [use](../../skills/programming/use/SKILL.md) | "Provides Build and maintain Rayden UI components and... | rayden use, design... |
| [use-agents](../../skills/programming/use-agents/SKILL.md) | Provides Build AI agents that interact with computers like... | computer use agents, ai... |
| [ux-designer](../../skills/programming/ux-designer/SKILL.md) | "Provides Create interface designs, wireframes, and design... | ui ux designer, web... |
| [v2-py](../../skills/programming/v2-py/SKILL.md) | Provides Build container-based Foundry Agents with Azure AI... | agents v2 py, ai... |
| [vantage](../../skills/programming/vantage/SKILL.md) | 'Provides Access 20+ years of global financial data:... | alpha vantage, data... |
| [vexor](../../skills/programming/vexor/SKILL.md) | "Provides Vector-powered CLI for semantic file search with... | vexor, development... |
| [videodb](../../skills/programming/videodb/SKILL.md) | "Provides Video and audio perception, indexing, and... | videodb, media... |
| [view-refactor](../../skills/programming/view-refactor/SKILL.md) | Provides Refactor SwiftUI views into smaller components... | swiftui view refactor, mobile... |
| [viewmodels-zafiro](../../skills/programming/viewmodels-zafiro/SKILL.md) | "Provides Optimal ViewModel and Wizard creation patterns... | avalonia viewmodels zafiro, development... |
| [vision-expert](../../skills/programming/vision-expert/SKILL.md) | Provides SOTA Computer Vision Expert (2026). Specialized in... | computer vision expert, ai... |
| [visual-validator](../../skills/programming/visual-validator/SKILL.md) | "Provides Rigorous visual validation expert specializing in... | ui visual validator, design... |
| [vitepress](../../skills/programming/vitepress/SKILL.md) | "Provides Transform generated wiki Markdown files into a... | wiki vitepress, content... |
| [vizcom](../../skills/programming/vizcom/SKILL.md) | "Provides AI-powered product design tool for transforming... | vizcom, design... |
| [web](../../skills/programming/web/SKILL.md) | Provides Web search, content extraction, crawling, and... | tavily web, data... |
| [web-experience](../../skills/programming/web-experience/SKILL.md) | "Provides Expert in building 3D experiences for the web -... | 3d web experience, design... |
| [widget-patterns](../../skills/programming/widget-patterns/SKILL.md) | "CRITICAL: Use for Robius widget patterns. Triggers on"... | robius widget patterns, development... |
| [widgets](../../skills/programming/widgets/SKILL.md) | 'Provides Version: makepad-widgets (dev branch) | Last... | makepad widgets, development... |
| [win11-speckit-update-skill](../../skills/programming/win11-speckit-update-skill/SKILL.md) | Provides windows 11 system management functionality and... | claude win11 speckit update skill, ai... |
| [windows](../../skills/programming/windows/SKILL.md) | "Provides PowerShell Windows patterns. Critical pitfalls,... | powershell windows, uncategorized... |
| [wizard](../../skills/programming/wizard/SKILL.md) | "Provides Done-for-you .faf generator. One-click AI context... | faf wizard, productivity... |
| [woocommerce-bridge](../../skills/programming/woocommerce-bridge/SKILL.md) | 'Provides Sync Odoo with WooCommerce: products, inventory,... | odoo woocommerce bridge, business... |
| [work-summary](../../skills/programming/work-summary/SKILL.md) | "Provides Go back through the previous year of work and... | sred work summary, project... |
| [workflow](../../skills/programming/workflow/SKILL.md) | Provides generate workflow json files for chaining ai... | fal workflow, ai... |
| [workspace-patterns](../../skills/programming/workspace-patterns/SKILL.md) | "Provides Configure and optimize Nx monorepo workspaces.... | nx workspace patterns, development... |
| [wrapper-product](../../skills/programming/wrapper-product/SKILL.md) | Provides Expert in building products that wrap AI APIs... | ai wrapper product, ai... |
| [writer](../../skills/programming/writer/SKILL.md) | "Provides Document creation, format conversion... | writer, document... |
| [writing](../../skills/programming/writing/SKILL.md) | "Provides this is the core skill for the deep research and... | scientific writing, content... |
| [writing-guide](../../skills/programming/writing-guide/SKILL.md) | "Provides this skill enforces sentry's blog writing... | blog writing guide, content... |
| [xml-views-builder](../../skills/programming/xml-views-builder/SKILL.md) | 'Provides Expert at building Odoo XML views: Form, List,... | odoo xml views builder, business... |
| [zafiro-development](../../skills/programming/zafiro-development/SKILL.md) | "Provides Mandatory skills, conventions, and behavioral... | avalonia zafiro development, development... |


### Trading (83 skills)

| Skill Name | Description | Triggers |
|---|---|---|
| [ai-anomaly-detection](../../skills/trading/ai-anomaly-detection/SKILL.md) | "Provides Detect anomalous market behavior, outliers, and... | ai anomaly detection, ai-anomaly-detection... |
| [ai-explainable-ai](../../skills/trading/ai-explainable-ai/SKILL.md) | "Provides Explainable AI for understanding and trusting... | ai explainable ai, ai-explainable-ai... |
| [ai-feature-engineering](../../skills/trading/ai-feature-engineering/SKILL.md) | "Implements create actionable trading features from raw... | actionable, ai feature engineering... |
| [ai-hyperparameter-tuning](../../skills/trading/ai-hyperparameter-tuning/SKILL.md) | "Implements optimize model configurations for trading... | ai hyperparameter tuning, ai-hyperparameter-tuning... |
| [ai-live-model-monitoring](../../skills/trading/ai-live-model-monitoring/SKILL.md) | "Provides Monitor production ML models for drift, decay,... | ai live model monitoring, ai-live-model-monitoring... |
| [ai-llm-orchestration](../../skills/trading/ai-llm-orchestration/SKILL.md) | "Large Language Model orchestration for trading analysis... | ai llm orchestration, ai-llm-orchestration... |
| [ai-model-ensemble](../../skills/trading/ai-model-ensemble/SKILL.md) | "Provides Combine multiple models for improved prediction... | ai model ensemble, ai-model-ensemble... |
| [ai-multi-asset-model](../../skills/trading/ai-multi-asset-model/SKILL.md) | "Provides Model inter-asset relationships for portfolio and... | ai multi asset model, ai-multi-asset-model... |
| [ai-news-embedding](../../skills/trading/ai-news-embedding/SKILL.md) | "Implements process news text using nlp embeddings for... | ai news embedding, ai-news-embedding... |
| [ai-order-flow-analysis](../../skills/trading/ai-order-flow-analysis/SKILL.md) | "Provides Analyze order flow to detect market pressure and... | ai order flow analysis, ai-order-flow-analysis... |
| [ai-regime-classification](../../skills/trading/ai-regime-classification/SKILL.md) | "Provides Detect current market regime for adaptive trading... | ai regime classification, ai-regime-classification... |
| [ai-reinforcement-learning](../../skills/trading/ai-reinforcement-learning/SKILL.md) | "Provides Reinforcement Learning for automated trading... | agents, ai reinforcement learning... |
| [ai-sentiment-analysis](../../skills/trading/ai-sentiment-analysis/SKILL.md) | "AI-powered sentiment analysis for news, social media, and... | ai sentiment analysis, ai-powered... |
| [ai-sentiment-features](../../skills/trading/ai-sentiment-features/SKILL.md) | "Provides Extract market sentiment from news, social media,... | ai sentiment features, ai-sentiment-features... |
| [ai-synthetic-data](../../skills/trading/ai-synthetic-data/SKILL.md) | "Provides Generate synthetic financial data for training... | ai synthetic data, ai-synthetic-data... |
| [ai-time-series-forecasting](../../skills/trading/ai-time-series-forecasting/SKILL.md) | "Provides Time series forecasting for price prediction and... | ai time series forecasting, ai-time-series-forecasting... |
| [ai-volatility-prediction](../../skills/trading/ai-volatility-prediction/SKILL.md) | "Implements forecast volatility for risk management and... | ai volatility prediction, ai-volatility-prediction... |
| [backtest-drawdown-analysis](../../skills/trading/backtest-drawdown-analysis/SKILL.md) | "Implements maximum drawdown, recovery time, and... | backtest drawdown analysis, backtest-drawdown-analysis... |
| [backtest-lookahead-bias](../../skills/trading/backtest-lookahead-bias/SKILL.md) | "Preventing lookahead bias in backtesting through strict... | backtest lookahead bias, backtest-lookahead-bias... |
| [backtest-position-exits](../../skills/trading/backtest-position-exits/SKILL.md) | "Exit strategies, trailing stops, and take-profit... | backtest position exits, backtest-position-exits... |
| [backtest-position-sizing](../../skills/trading/backtest-position-sizing/SKILL.md) | "'Position Sizing Algorithms: Fixed Fractional, Kelly... | algorithms, backtest position sizing... |
| [backtest-sharpe-ratio](../../skills/trading/backtest-sharpe-ratio/SKILL.md) | "Provides Sharpe Ratio Calculation and Risk-Adjusted... | backtest sharpe ratio, backtest-sharpe-ratio... |
| [backtest-walk-forward](../../skills/trading/backtest-walk-forward/SKILL.md) | "Implements walk-forward optimization for robust strategy... | backtest walk forward, backtest-walk-forward... |
| [data-alternative-data](../../skills/trading/data-alternative-data/SKILL.md) | "Alternative data ingestion pipelines for trading signals... | data alternative data, data-alternative-data... |
| [data-backfill-strategy](../../skills/trading/data-backfill-strategy/SKILL.md) | "Provides Strategic data backfill for populating historical... | data backfill strategy, data-backfill-strategy... |
| [data-candle-data](../../skills/trading/data-candle-data/SKILL.md) | "OHLCV candle data processing, timeframe management, and... | data candle data, data-candle-data... |
| [data-enrichment](../../skills/trading/data-enrichment/SKILL.md) | "Provides Data enrichment techniques for adding context to... | adding, context... |
| [data-feature-store](../../skills/trading/data-feature-store/SKILL.md) | "Provides Feature storage and management for machine... | data feature store, data-feature-store... |
| [data-lake](../../skills/trading/data-lake/SKILL.md) | "Provides Data lake architecture and management for trading... | architecture, data lake... |
| [data-order-book](../../skills/trading/data-order-book/SKILL.md) | "Order book data handling, spread calculation, liquidity... | calculation, data order book... |
| [data-stream-processing](../../skills/trading/data-stream-processing/SKILL.md) | "Provides Streaming data processing for real-time trading... | data stream processing, data-stream-processing... |
| [data-time-series-database](../../skills/trading/data-time-series-database/SKILL.md) | "Provides Time-series database queries and optimization for... | data time series database, data-time-series-database... |
| [data-validation](../../skills/trading/data-validation/SKILL.md) | "Provides Data validation and quality assurance for trading... | assurance, data validation... |
| [exchange-ccxt-patterns](../../skills/trading/exchange-ccxt-patterns/SKILL.md) | "Effective patterns for using CCXT library for exchange... | connectivity, effective... |
| [exchange-failover-handling](../../skills/trading/exchange-failover-handling/SKILL.md) | "Provides Automated failover and redundancy management for... | automated, exchange failover handling... |
| [exchange-health](../../skills/trading/exchange-health/SKILL.md) | "Provides Exchange system health monitoring and... | connectivity, exchange health... |
| [exchange-market-data-cache](../../skills/trading/exchange-market-data-cache/SKILL.md) | "High-performance caching layer for market data with low... | caching, exchange market data cache... |
| [exchange-order-book-sync](../../skills/trading/exchange-order-book-sync/SKILL.md) | "Provides Order book synchronization and state management... | exchange order book sync, exchange-order-book-sync... |
| [exchange-order-execution-api](../../skills/trading/exchange-order-execution-api/SKILL.md) | "Implements order execution and management api for trading... | exchange order execution api, exchange-order-execution-api... |
| [exchange-rate-limiting](../../skills/trading/exchange-rate-limiting/SKILL.md) | "Rate Limiting Strategies and Circuit Breaker Patterns for... | breaker, circuit... |
| [exchange-trade-reporting](../../skills/trading/exchange-trade-reporting/SKILL.md) | "Real-time trade reporting and execution analytics for... | analytics, exchange trade reporting... |
| [exchange-websocket-handling](../../skills/trading/exchange-websocket-handling/SKILL.md) | "Real-time market data handling with WebSockets including... | exchange websocket handling, exchange-websocket-handling... |
| [exchange-websocket-streaming](../../skills/trading/exchange-websocket-streaming/SKILL.md) | "Implements real-time market data streaming and processing... | exchange websocket streaming, exchange-websocket-streaming... |
| [execution-order-book-impact](../../skills/trading/execution-order-book-impact/SKILL.md) | "Provides Order Book Impact Measurement and Market... | execution order book impact, execution-order-book-impact... |
| [execution-rate-limiting](../../skills/trading/execution-rate-limiting/SKILL.md) | "Provides Rate Limiting and Exchange API Management for... | exchange, execution rate limiting... |
| [execution-slippage-modeling](../../skills/trading/execution-slippage-modeling/SKILL.md) | "Slippage Estimation, Simulation, and Fee Modeling for... | estimation, execution slippage modeling... |
| [execution-twap](../../skills/trading/execution-twap/SKILL.md) | "Time-Weighted Average Price algorithm for executing large... | average, execution twap... |
| [execution-twap-vwap](../../skills/trading/execution-twap-vwap/SKILL.md) | 'Provides ''TWAP and VWAP Execution Algorithms:... | algorithms, execution twap vwap... |
| [execution-vwap](../../skills/trading/execution-vwap/SKILL.md) | "Volume-Weighted Average Price algorithm for executing... | average, execution vwap... |
| [fundamentals-market-regimes](../../skills/trading/fundamentals-market-regimes/SKILL.md) | "Market regime detection and adaptation for trading systems... | adaptation, detection... |
| [fundamentals-market-structure](../../skills/trading/fundamentals-market-structure/SKILL.md) | "Implements market structure and trading participants... | analysis, fundamentals market structure... |
| [fundamentals-risk-management-basics](../../skills/trading/fundamentals-risk-management-basics/SKILL.md) | "Position sizing, stop-loss implementation, and... | fundamentals risk management basics, fundamentals-risk-management-basics... |
| [fundamentals-trading-edge](../../skills/trading/fundamentals-trading-edge/SKILL.md) | "Provides Finding and maintaining competitive advantage in... | competitive, finding... |
| [fundamentals-trading-plan](../../skills/trading/fundamentals-trading-plan/SKILL.md) | "Implements trading plan structure and risk management... | cloud infrastructure, framework... |
| [fundamentals-trading-psychology](../../skills/trading/fundamentals-trading-psychology/SKILL.md) | "Emotional discipline, cognitive bias awareness, and... | cognitive, discipline... |
| [paper-commission-model](../../skills/trading/paper-commission-model/SKILL.md) | "Implements commission model and fee structure simulation... | cloud infrastructure, paper commission model... |
| [paper-fill-simulation](../../skills/trading/paper-fill-simulation/SKILL.md) | "Implements fill simulation models for order execution... | execution, models... |
| [paper-market-impact](../../skills/trading/paper-market-impact/SKILL.md) | "Implements market impact modeling and order book... | modeling, order... |
| [paper-performance-attribution](../../skills/trading/paper-performance-attribution/SKILL.md) | "Provides Performance Attribution Systems for Trading... | optimization, paper performance attribution... |
| [paper-realistic-simulation](../../skills/trading/paper-realistic-simulation/SKILL.md) | "Provides Realistic Paper Trading Simulation with Market... | impact, market... |
| [paper-slippage-model](../../skills/trading/paper-slippage-model/SKILL.md) | "Implements slippage modeling and execution simulation for... | execution, modeling... |
| [risk-correlation-risk](../../skills/trading/risk-correlation-risk/SKILL.md) | "Implements correlation breakdown and portfolio... | breakdown, diversification... |
| [risk-drawdown-control](../../skills/trading/risk-drawdown-control/SKILL.md) | "Implements maximum drawdown control and equity... | equity, maximum... |
| [risk-kill-switches](../../skills/trading/risk-kill-switches/SKILL.md) | "Implementing multi-layered kill switches at account,... | account, implementing... |
| [risk-liquidity-risk](../../skills/trading/risk-liquidity-risk/SKILL.md) | "Implements liquidity assessment and trade execution risk... | assessment, execution... |
| [risk-position-sizing](../../skills/trading/risk-position-sizing/SKILL.md) | "Calculating optimal position sizes using Kelly criterion,... | calculating, optimal... |
| [risk-stop-loss](../../skills/trading/risk-stop-loss/SKILL.md) | "Implements stop loss strategies for risk management for... | management, risk stop loss... |
| [risk-stress-testing](../../skills/trading/risk-stress-testing/SKILL.md) | "Implements stress test scenarios and portfolio resilience... | portfolio, resilience... |
| [risk-tail-risk](../../skills/trading/risk-tail-risk/SKILL.md) | "Implements tail risk management and extreme event... | event, extreme... |
| [risk-value-at-risk](../../skills/trading/risk-value-at-risk/SKILL.md) | "Implements value at risk calculations for portfolio risk... | calculations, management... |
| [technical-cycle-analysis](../../skills/trading/technical-cycle-analysis/SKILL.md) | "Implements market cycles and periodic patterns in price... | cycles, market... |
| [technical-false-signal-filtering](../../skills/trading/technical-false-signal-filtering/SKILL.md) | "Provides False Signal Filtering Techniques for Robust... | analysis, robust... |
| [technical-indicator-confluence](../../skills/trading/technical-indicator-confluence/SKILL.md) | "Provides Indicator Confluence Validation Systems for... | confirming, systems... |
| [technical-intermarket-analysis](../../skills/trading/technical-intermarket-analysis/SKILL.md) | "Implements cross-market relationships and asset class... | asset, cross-market... |
| [technical-market-microstructure](../../skills/trading/technical-market-microstructure/SKILL.md) | "Implements order book dynamics and order flow analysis for... | analysis, dynamics... |
| [technical-momentum-indicators](../../skills/trading/technical-momentum-indicators/SKILL.md) | "Implements rsi, macd, stochastic oscillators and momentum... | analysis, oscillators... |
| [technical-price-action-patterns](../../skills/trading/technical-price-action-patterns/SKILL.md) | "Provides Analysis of candlestick and chart patterns for... | analysis, candlestick... |
| [technical-regime-detection](../../skills/trading/technical-regime-detection/SKILL.md) | "Provides Market Regime Detection Systems for Adaptive... | adaptive, market... |
| [technical-statistical-arbitrage](../../skills/trading/technical-statistical-arbitrage/SKILL.md) | "Implements pair trading and cointegration-based arbitrage... | cointegration-based, strategies... |
| [technical-support-resistance](../../skills/trading/technical-support-resistance/SKILL.md) | "Implements technical levels where price tends to pause or... | levels, price... |
| [technical-trend-analysis](../../skills/trading/technical-trend-analysis/SKILL.md) | "Provides Trend identification, classification, and... | classification, continuation... |
| [technical-volatility-analysis](../../skills/trading/technical-volatility-analysis/SKILL.md) | "Implements volatility measurement, forecasting, and risk... | assessment, forecasting... |
| [technical-volume-profile](../../skills/trading/technical-volume-profile/SKILL.md) | "Provides Volume analysis techniques for understanding... | analysis, technical volume profile... |

## Skills by Role


### Implementation (Build Features) (1421 skills)

| Skill Name | Domain | Description |
|---|---|---|
| [3d-integration](../../skills/3d-integration/SKILL.md) | Programming | "Provides use when adding interactive 3d scenes from... |
| [a11y](../../skills/a11y/SKILL.md) | Programming | "Provides Audit a StyleSeed-based component or page for... |
| [access-review](../../skills/access-review/SKILL.md) | Coding | "Implements django-access-review patterns for software... |
| [accessibility](../../skills/accessibility/SKILL.md) | Coding | "Provides Audit and fix HTML accessibility issues including... |
| [accounting-setup](../../skills/accounting-setup/SKILL.md) | Programming | 'Provides Expert guide for configuring Odoo Accounting:... |
| [actions-auditor](../../skills/actions-auditor/SKILL.md) | Programming | Audits GitHub Actions workflows for security... |
| [activity-planner](../../skills/activity-planner/SKILL.md) | Programming | "Provides Plan puzzle-based activities for classrooms,... |
| [actor-development](../../skills/actor-development/SKILL.md) | Agent | 'Provides Important: Before you begin, fill in the... |
| [actorization](../../skills/actorization/SKILL.md) | Agent | Provides Actorization converts existing software into... |
| [adhx](../../skills/adhx/SKILL.md) | Programming | Provides Fetch any X/Twitter post as clean LLM-friendly... |
| [admin](../../skills/admin/SKILL.md) | Cncf | "Provides Expert database administrator specializing in... |
| [ads](../../skills/ads/SKILL.md) | Programming | "Provides You are an expert performance marketer with... |
| [advanced-types](../../skills/advanced-types/SKILL.md) | Coding | "Provides Comprehensive guidance for mastering TypeScript's... |
| [advisor](../../skills/advisor/SKILL.md) | Agent | "Provides Conselho de especialistas — consulta multiplos... |
| [advisor](../../skills/advisor/SKILL.md) | Programming | Provides Draft privacy policies, terms of service,... |
| [aeo-blog-writer](../../skills/aeo-blog-writer/SKILL.md) | Programming | "Provides Writes long-form blog posts with TL;DR block,... |
| [aeo-check](../../skills/aeo-check/SKILL.md) | Coding | "Provides Score any MCP server, API, or CLI for... |
| [aeo-content-cluster](../../skills/aeo-content-cluster/SKILL.md) | Programming | "Builds a topical authority map with a pillar page,... |
| [aeo-content-quality-auditor](../../skills/aeo-content-quality-auditor/SKILL.md) | Programming | "Audits content for SEO and AEO performance with scored... |
| [aeo-internal-linking](../../skills/aeo-internal-linking/SKILL.md) | Programming | "Provides Maps internal link opportunities between pages... |
| [aeo-keyword-research](../../skills/aeo-keyword-research/SKILL.md) | Programming | "Provides Researches and prioritises SEO keywords with AEO... |
| [aeo-landing-page-writer](../../skills/aeo-landing-page-writer/SKILL.md) | Programming | "Provides Writes complete, structured landing pages... |
| [aeo-meta-description-generator](../../skills/aeo-meta-description-generator/SKILL.md) | Programming | "Provides Writes 3 title tag variants and 3 meta... |
| [aeo-schema-generator](../../skills/aeo-schema-generator/SKILL.md) | Programming | Generates valid JSON-LD structured data for 10 schema types... |
| [agent](../../skills/agent/SKILL.md) | Programming | Provides Agente de contexto para continuidade entre... |
| [agent-brainstorming](../../skills/agent-brainstorming/SKILL.md) | Programming | Provides Simulate a structured peer-review process using... |
| [agent-development](../../skills/agent-development/SKILL.md) | Agent | "Provides AI agent development workflow for building... |
| [agent-memory](../../skills/agent-memory/SKILL.md) | Agent | "Provides Scoped CLAUDE.md memory system that reduces... |
| [agent-patterns](../../skills/agent-patterns/SKILL.md) | Agent | Implements this skill should be used when the user asks to... |
| [agent-patterns](../../skills/agent-patterns/SKILL.md) | Programming | Provides Design patterns for building autonomous coding... |
| [agentflow](../../skills/agentflow/SKILL.md) | Programming | "Provides Orchestrate autonomous AI development pipelines... |
| [agentfolio](../../skills/agentfolio/SKILL.md) | Programming | Provides Skill for discovering and researching autonomous... |
| [agentmail](../../skills/agentmail/SKILL.md) | Programming | Provides Email infrastructure for AI agents. Create... |
| [agentphone](../../skills/agentphone/SKILL.md) | Programming | Provides Build AI phone agents with AgentPhone API. Use... |
| [agents](../../skills/agents/SKILL.md) | Agent | Provides Build background agents in sandboxed environments.... |
| [agents](../../skills/agents/SKILL.md) | Agent | Provides Multi-agent orchestration patterns. Use when... |
| [agents](../../skills/agents/SKILL.md) | Programming | Provides Autonomous agents are AI systems that can... |
| [agents](../../skills/agents/SKILL.md) | Programming | Provides Voice agents represent the frontier of AI... |
| [agents-architect](../../skills/agents-architect/SKILL.md) | Agent | Provides Expert in designing and building autonomous AI... |
| [agents-dotnet](../../skills/agents-dotnet/SKILL.md) | Agent | Provides Microsoft 365 Agents SDK for .NET. Build... |
| [agents-py](../../skills/agents-py/SKILL.md) | Programming | Provides Microsoft 365 Agents SDK for Python. Build... |
| [agents-ts](../../skills/agents-ts/SKILL.md) | Agent | Implements microsoft 365 agents sdk for typescript/node.js... |
| [agents-v2-py](../../skills/agents-v2-py/SKILL.md) | Agent | Provides Build hosted agents using Azure AI Projects SDK... |
| [ai](../../skills/ai/SKILL.md) | Agent | "Provides Build production-ready AI agents with PydanticAI... |
| [ai](../../skills/ai/SKILL.md) | Cncf | "Provides Autonomous DevSecOps & FinOps Guardrails.... |
| [ai](../../skills/ai/SKILL.md) | Programming | "Provides Geracao de imagens via Stability AI (SD3.5,... |
| [ai-agents-persistent-dotnet](../../skills/ai-agents-persistent-dotnet/SKILL.md) | Cncf | "Provides Azure AI Agents Persistent SDK for .NET.... |
| [ai-agents-persistent-java](../../skills/ai-agents-persistent-java/SKILL.md) | Cncf | "Provides Azure AI Agents Persistent SDK for Java.... |
| [ai-anomaly-detection](../../skills/ai-anomaly-detection/SKILL.md) | Trading | "Provides Detect anomalous market behavior, outliers, and... |
| [ai-anomalydetector-java](../../skills/ai-anomalydetector-java/SKILL.md) | Cncf | "Provides Build anomaly detection applications with Azure... |
| [ai-contentsafety-java](../../skills/ai-contentsafety-java/SKILL.md) | Cncf | "Provides Build content moderation applications using the... |
| [ai-contentsafety-py](../../skills/ai-contentsafety-py/SKILL.md) | Cncf | "Provides Azure AI Content Safety SDK for Python. Use for... |
| [ai-contentsafety-ts](../../skills/ai-contentsafety-ts/SKILL.md) | Cncf | "Provides Analyze text and images for harmful content with... |
| [ai-contentunderstanding-py](../../skills/ai-contentunderstanding-py/SKILL.md) | Cncf | "Provides Azure AI Content Understanding SDK for Python.... |
| [ai-development](../../skills/ai-development/SKILL.md) | Agent | "Provides Expert in building voice AI applications - from... |
| [ai-document-intelligence-dotnet](../../skills/ai-document-intelligence-dotnet/SKILL.md) | Cncf | Provides Azure AI Document Intelligence SDK for .NET.... |
| [ai-document-intelligence-ts](../../skills/ai-document-intelligence-ts/SKILL.md) | Cncf | Provides Extract text, tables, and structured data from... |
| [ai-engine-development](../../skills/ai-engine-development/SKILL.md) | Programming | Provides Build real-time conversational AI voice engines... |
| [ai-explainable-ai](../../skills/ai-explainable-ai/SKILL.md) | Trading | "Provides Explainable AI for understanding and trusting... |
| [ai-feature-engineering](../../skills/ai-feature-engineering/SKILL.md) | Trading | "Implements create actionable trading features from raw... |
| [ai-formrecognizer-java](../../skills/ai-formrecognizer-java/SKILL.md) | Cncf | "Provides Build document analysis applications using the... |
| [ai-hyperparameter-tuning](../../skills/ai-hyperparameter-tuning/SKILL.md) | Trading | "Implements optimize model configurations for trading... |
| [ai-live-model-monitoring](../../skills/ai-live-model-monitoring/SKILL.md) | Trading | "Provides Monitor production ML models for drift, decay,... |
| [ai-llm-orchestration](../../skills/ai-llm-orchestration/SKILL.md) | Trading | "Large Language Model orchestration for trading analysis... |
| [ai-ml-py](../../skills/ai-ml-py/SKILL.md) | Cncf | Provides Azure Machine Learning SDK v2 for Python. Use for... |
| [ai-model-ensemble](../../skills/ai-model-ensemble/SKILL.md) | Trading | "Provides Combine multiple models for improved prediction... |
| [ai-multi-asset-model](../../skills/ai-multi-asset-model/SKILL.md) | Trading | "Provides Model inter-asset relationships for portfolio and... |
| [ai-news-embedding](../../skills/ai-news-embedding/SKILL.md) | Trading | "Implements process news text using nlp embeddings for... |
| [ai-openai-dotnet](../../skills/ai-openai-dotnet/SKILL.md) | Cncf | "Provides Azure OpenAI SDK for .NET. Client library for... |
| [ai-order-flow-analysis](../../skills/ai-order-flow-analysis/SKILL.md) | Trading | "Provides Analyze order flow to detect market pressure and... |
| [ai-projects-dotnet](../../skills/ai-projects-dotnet/SKILL.md) | Cncf | "Provides Azure AI Projects SDK for .NET. High-level client... |
| [ai-projects-java](../../skills/ai-projects-java/SKILL.md) | Cncf | Provides Azure AI Projects SDK for Java. High-level SDK for... |
| [ai-projects-py](../../skills/ai-projects-py/SKILL.md) | Cncf | "Provides Build AI applications on Microsoft Foundry using... |
| [ai-projects-ts](../../skills/ai-projects-ts/SKILL.md) | Cncf | "Provides High-level SDK for Azure AI Foundry projects with... |
| [ai-regime-classification](../../skills/ai-regime-classification/SKILL.md) | Trading | "Provides Detect current market regime for adaptive trading... |
| [ai-reinforcement-learning](../../skills/ai-reinforcement-learning/SKILL.md) | Trading | "Provides Reinforcement Learning for automated trading... |
| [ai-sdk-expert](../../skills/ai-sdk-expert/SKILL.md) | Programming | "Provides Expert in the Vercel AI SDK. Covers Core API... |
| [ai-sentiment-analysis](../../skills/ai-sentiment-analysis/SKILL.md) | Trading | "AI-powered sentiment analysis for news, social media, and... |
| [ai-sentiment-features](../../skills/ai-sentiment-features/SKILL.md) | Trading | "Provides Extract market sentiment from news, social media,... |
| [ai-synthetic-data](../../skills/ai-synthetic-data/SKILL.md) | Trading | "Provides Generate synthetic financial data for training... |
| [ai-textanalytics-py](../../skills/ai-textanalytics-py/SKILL.md) | Cncf | "Provides Azure AI Text Analytics SDK for sentiment... |
| [ai-time-series-forecasting](../../skills/ai-time-series-forecasting/SKILL.md) | Trading | "Provides Time series forecasting for price prediction and... |
| [ai-transcription-py](../../skills/ai-transcription-py/SKILL.md) | Cncf | "Provides Azure AI Transcription SDK for Python. Use for... |
| [ai-translation-document-py](../../skills/ai-translation-document-py/SKILL.md) | Cncf | "Provides Azure AI Document Translation SDK for batch... |
| [ai-translation-text-py](../../skills/ai-translation-text-py/SKILL.md) | Cncf | "Provides Azure AI Text Translation SDK for real-time text... |
| [ai-translation-ts](../../skills/ai-translation-ts/SKILL.md) | Cncf | "Configures text and document translation with rest-style... |
| [ai-vision-imageanalysis-java](../../skills/ai-vision-imageanalysis-java/SKILL.md) | Cncf | "Provides Build image analysis applications with Azure AI... |
| [ai-vision-imageanalysis-py](../../skills/ai-vision-imageanalysis-py/SKILL.md) | Cncf | "Provides Azure AI Vision Image Analysis SDK for captions,... |
| [ai-voicelive-dotnet](../../skills/ai-voicelive-dotnet/SKILL.md) | Cncf | "Provides Azure AI Voice Live SDK for .NET. Build real-time... |
| [ai-voicelive-java](../../skills/ai-voicelive-java/SKILL.md) | Cncf | "Provides Azure AI VoiceLive SDK for Java. Real-time... |
| [ai-voicelive-py](../../skills/ai-voicelive-py/SKILL.md) | Cncf | "Provides Build real-time voice AI applications with... |
| [ai-voicelive-ts](../../skills/ai-voicelive-ts/SKILL.md) | Cncf | "Provides Azure AI Voice Live SDK for... |
| [ai-volatility-prediction](../../skills/ai-volatility-prediction/SKILL.md) | Trading | "Implements forecast volatility for risk management and... |
| [ai-writing](../../skills/ai-writing/SKILL.md) | Programming | "Provides Audit and rewrite content to remove 21 categories... |
| [alexa](../../skills/alexa/SKILL.md) | Cncf | "Provides Integracao completa com Amazon Alexa para criar... |
| [ally-health](../../skills/ally-health/SKILL.md) | Programming | Provides a health assistant skill for medical information... |
| [alternatives](../../skills/alternatives/SKILL.md) | Programming | "Provides You are an expert in creating competitor... |
| [altman](../../skills/altman/SKILL.md) | Programming | "Provides Agente que simula Sam Altman — CEO da OpenAI,... |
| [analysis](../../skills/analysis/SKILL.md) | Programming | "Provides Find similar vulnerabilities and bugs across... |
| [analyst](../../skills/analyst/SKILL.md) | Programming | Provides Master modern business analysis with AI-powered... |
| [analyst](../../skills/analyst/SKILL.md) | Programming | "Provides Build financial models, backtest trading... |
| [analyst](../../skills/analyst/SKILL.md) | Programming | "Provides Expert startup business analyst specializing in... |
| [analytics-automation](../../skills/analytics-automation/SKILL.md) | Agent | 'Provides Automate Google Analytics tasks via Rube MCP... |
| [analyzer](../../skills/analyzer/SKILL.md) | Programming | "Provides AI驱动的综合健康分析系 统，整合多维度健康数据、识别 异常模式、预测健康风险、提供... |
| [analyzer](../../skills/analyzer/SKILL.md) | Programming | "Provides 分析运动数据、识别运 动模式、评估健身进展，并提供 个性化训练建议。支持与慢性病 数据的关联分析。... |
| [analyzer](../../skills/analyzer/SKILL.md) | Programming | "Provides 分析健康目标数据、识 别目标模式、评估目标进度,并提 供个性化目标管理建议。支持与... |
| [analyzer](../../skills/analyzer/SKILL.md) | Programming | "Provides 分析营养数据、识别营 养模式、评估营养状况，并提供 个性化营养建议。支持与运动、... |
| [analyzer](../../skills/analyzer/SKILL.md) | Programming | "Provides 分析康复训练数据、识 别康复模式、评估康复进展，并 提供个性化康复建议 functionality... |
| [analyzer](../../skills/analyzer/SKILL.md) | Programming | "Provides 分析睡眠数据、识别睡 眠模式、评估睡眠质量，并提供 个性化睡眠改善建议。支持与其... |
| [analyzer](../../skills/analyzer/SKILL.md) | Programming | "Provides 分析减肥数据、计算代 谢率、追踪能量缺口、管理减肥 阶段 functionality and... |
| [and-analyze-video](../../skills/and-analyze-video/SKILL.md) | Programming | Provides Seek and analyze video content using Memories.ai... |
| [andruia-consultant](../../skills/andruia-consultant/SKILL.md) | Agent | "Provides Arquitecto de Soluciones Principal y Consultor... |
| [andruia-niche-intelligence](../../skills/andruia-niche-intelligence/SKILL.md) | Agent | "Provides Estratega de Inteligencia de Dominio de Andru.ia.... |
| [andruia-skill-smith](../../skills/andruia-skill-smith/SKILL.md) | Agent | "Provides Ingeniero de Sistemas de Andru.ia. Diseña,... |
| [angular](../../skills/angular/SKILL.md) | Programming | "Provides Modern Angular (v20+) expert with deep knowledge... |
| [animation](../../skills/animation/SKILL.md) | Programming | "Provides Advanced JavaScript animation library skill for... |
| [animation](../../skills/animation/SKILL.md) | Programming | "Provides Three.js animation - keyframe animation, skeletal... |
| [animator](../../skills/animator/SKILL.md) | Programming | "Provides AI-powered animation tool for creating motion in... |
| [api](../../skills/api/SKILL.md) | Programming | 'Provides Build apps with the Claude API or Anthropic SDK.... |
| [api-dev](../../skills/api-dev/SKILL.md) | Programming | 'Provides the gemini api provides access to google''s most... |
| [api-integration](../../skills/api-integration/SKILL.md) | Agent | Provides use when integrating google gemini api into... |
| [api-integration-patterns](../../skills/api-integration-patterns/SKILL.md) | Coding | "Provides Production-ready patterns for integrating... |
| [api-routes](../../skills/api-routes/SKILL.md) | Programming | "Provides Guidelines for creating API routes in Expo Router... |
| [app-patterns](../../skills/app-patterns/SKILL.md) | Programming | Provides Production-ready patterns for building LLM... |
| [app-router-patterns](../../skills/app-router-patterns/SKILL.md) | Coding | "Provides Comprehensive patterns for Next.js 14+ App Router... |
| [appconfiguration-java](../../skills/appconfiguration-java/SKILL.md) | Cncf | "Provides Azure App Configuration SDK for Java. Centralized... |
| [appconfiguration-py](../../skills/appconfiguration-py/SKILL.md) | Cncf | "Provides Azure App Configuration SDK for Python. Use for... |
| [appconfiguration-ts](../../skills/appconfiguration-ts/SKILL.md) | Cncf | "Provides Centralized configuration management with feature... |
| [appdeploy](../../skills/appdeploy/SKILL.md) | Coding | "Provides Deploy web apps with backend APIs, database, and... |
| [application-dev-ai-assistant](../../skills/application-dev-ai-assistant/SKILL.md) | Programming | Provides You are an AI assistant development expert... |
| [application-dev-langchain-agent](../../skills/application-dev-langchain-agent/SKILL.md) | Programming | Provides You are an expert LangChain agent developer... |
| [application-dev-prompt-optimize](../../skills/application-dev-prompt-optimize/SKILL.md) | Programming | Provides You are an expert prompt engineer specializing in... |
| [apps](../../skills/apps/SKILL.md) | Cncf | "Provides Expert patterns for Shopify app development... |
| [ar](../../skills/ar/SKILL.md) | Programming | "Provides VR/AR development principles. Comfort,... |
| [arc-designer](../../skills/arc-designer/SKILL.md) | Programming | "Provides one sentence - what this skill does and when to... |
| [architect](../../skills/architect/SKILL.md) | Cncf | "Provides Expert cloud architect specializing in... |
| [architect](../../skills/architect/SKILL.md) | Cncf | Provides Expert database architect specializing in data... |
| [architect](../../skills/architect/SKILL.md) | Cncf | Provides Expert Kubernetes architect specializing in... |
| [architect](../../skills/architect/SKILL.md) | Coding | "Provides Expert backend architect specializing in scalable... |
| [architect](../../skills/architect/SKILL.md) | Coding | "Creates comprehensive technical documentation from... |
| [architect](../../skills/architect/SKILL.md) | Coding | "Provides Master modern GraphQL with federation,... |
| [architect](../../skills/architect/SKILL.md) | Programming | "Provides Expert .NET backend architect specializing in C#,... |
| [architect](../../skills/architect/SKILL.md) | Programming | "Provides Expert in monorepo architecture, build systems,... |
| [architect](../../skills/architect/SKILL.md) | Programming | "Provides Complete toolkit for senior architect with modern... |
| [architect](../../skills/architect/SKILL.md) | Programming | "Provides You are a documentation architect that produces... |
| [architecture](../../skills/architecture/SKILL.md) | Coding | "Provides Architectural decision-making framework.... |
| [architecture](../../skills/architecture/SKILL.md) | Coding | "Provides Plan or restructure website hierarchy,... |
| [architecture](../../skills/architecture/SKILL.md) | Coding | "Provides Guide for quality focused software architecture.... |
| [architecture](../../skills/architecture/SKILL.md) | Programming | Provides Master the LangChain framework for building... |
| [architecture-c4-architecture](../../skills/architecture-c4-architecture/SKILL.md) | Coding | "Provides Generate comprehensive C4 architecture... |
| [architecture-review](../../skills/architecture-review/SKILL.md) | Programming | "Provides Review Bitcoin Lightning Network protocol... |
| [art](../../skills/art/SKILL.md) | Programming | "Provides Algorithmic philosophies are computational... |
| [art](../../skills/art/SKILL.md) | Programming | "Provides Game art principles. Visual style selection,... |
| [article-publisher-skill](../../skills/article-publisher-skill/SKILL.md) | Programming | "Provides publish articles to x/twitter functionality and... |
| [artifacts-builder](../../skills/artifacts-builder/SKILL.md) | Programming | 'Provides To build powerful frontend claude.ai artifacts,... |
| [astro](../../skills/astro/SKILL.md) | Coding | "Provides Build content-focused websites with Astro — zero... |
| [astropy](../../skills/astropy/SKILL.md) | Programming | Provides Astropy is the core Python package for astronomy,... |
| [async](../../skills/async/SKILL.md) | Programming | "Provides Practical async patterns using TaskEither - clean... |
| [async-patterns](../../skills/async-patterns/SKILL.md) | Programming | "Provides Master Rust async programming with Tokio, async... |
| [audience-analysis](../../skills/audience-analysis/SKILL.md) | Agent | Provides Understand audience demographics, preferences,... |
| [audio](../../skills/audio/SKILL.md) | Agent | "Implements text-to-speech and speech-to-text using fal.ai... |
| [audio](../../skills/audio/SKILL.md) | Programming | "Provides Game audio principles. Sound design, music... |
| [audit](../../skills/audit/SKILL.md) | Agent | Provides Comprehensive security auditing workflow covering... |
| [audit](../../skills/audit/SKILL.md) | Programming | "Provides Diagnose and audit SEO issues affecting... |
| [audit](../../skills/audit/SKILL.md) | Programming | "Provides Audit screens against Nielsen's heuristics and... |
| [audit-patterns](../../skills/audit-patterns/SKILL.md) | Programming | "Provides Comprehensive guide to auditing web content... |
| [audit-pre-push](../../skills/audit-pre-push/SKILL.md) | Programming | 'Provides Deep audit before GitHub push: removes junk... |
| [auth](../../skills/auth/SKILL.md) | Programming | "Provides Expert patterns for Clerk auth implementation,... |
| [authority-builder](../../skills/authority-builder/SKILL.md) | Programming | "Analyzes content for E-E-A-T signals and suggests... |
| [auto-research](../../skills/auto-research/SKILL.md) | Agent | "Provides Automatically fetch latest library/framework... |
| [automated-tests](../../skills/automated-tests/SKILL.md) | Programming | "Provides Write and run Odoo automated tests using... |
| [automation](../../skills/automation/SKILL.md) | Agent | 'Provides Automate Airtable tasks via Rube MCP (Composio):... |
| [automation](../../skills/automation/SKILL.md) | Agent | 'Provides Automate CircleCI tasks via Rube MCP (Composio):... |
| [automation](../../skills/automation/SKILL.md) | Agent | Provides Automate ClickUp project management including... |
| [automation](../../skills/automation/SKILL.md) | Agent | Provides Automate Freshdesk helpdesk operations including... |
| [automation](../../skills/automation/SKILL.md) | Agent | 'Provides Automate HelpDesk tasks via Rube MCP (Composio):... |
| [automation](../../skills/automation/SKILL.md) | Agent | Provides Automate HubSpot CRM operations (contacts,... |
| [automation](../../skills/automation/SKILL.md) | Agent | 'Provides Automate Intercom tasks via Rube MCP (Composio):... |
| [automation](../../skills/automation/SKILL.md) | Agent | 'Provides Automate Make (Integromat) tasks via Rube MCP... |
| [automation](../../skills/automation/SKILL.md) | Agent | 'Provides Automate Notion tasks via Rube MCP (Composio):... |
| [automation](../../skills/automation/SKILL.md) | Agent | 'Provides Automate Outlook tasks via Rube MCP (Composio):... |
| [automation](../../skills/automation/SKILL.md) | Agent | 'Provides Automate Render tasks via Rube MCP (Composio):... |
| [automation](../../skills/automation/SKILL.md) | Agent | Provides Automate SendGrid email delivery workflows... |
| [automation](../../skills/automation/SKILL.md) | Agent | 'Provides Automate Shopify tasks via Rube MCP (Composio):... |
| [automation](../../skills/automation/SKILL.md) | Agent | Provides Automate Slack workspace operations including... |
| [automation](../../skills/automation/SKILL.md) | Agent | 'Provides Automate Stripe tasks via Rube MCP (Composio):... |
| [automation](../../skills/automation/SKILL.md) | Agent | 'Provides Automate Zendesk tasks via Rube MCP (Composio):... |
| [automation](../../skills/automation/SKILL.md) | Agent | Provides Automate Zoom meeting creation, management,... |
| [automation](../../skills/automation/SKILL.md) | Cncf | 'Provides Automate Datadog tasks via Rube MCP (Composio):... |
| [automation](../../skills/automation/SKILL.md) | Cncf | 'Provides Automate Discord tasks via Rube MCP (Composio):... |
| [automation](../../skills/automation/SKILL.md) | Cncf | 'Provides Automate PagerDuty tasks via Rube MCP (Composio):... |
| [automation](../../skills/automation/SKILL.md) | Cncf | 'Provides Automate Postmark email delivery tasks via Rube... |
| [automation](../../skills/automation/SKILL.md) | Cncf | 'Provides Automate Salesforce tasks via Rube MCP... |
| [automation](../../skills/automation/SKILL.md) | Cncf | 'Provides Automate Sentry tasks via Rube MCP (Composio):... |
| [automation](../../skills/automation/SKILL.md) | Cncf | 'Provides Automate Square tasks via Rube MCP (Composio):... |
| [automation](../../skills/automation/SKILL.md) | Cncf | 'Provides Automate Telegram tasks via Rube MCP (Composio):... |
| [automation](../../skills/automation/SKILL.md) | Cncf | 'Provides Automate WhatsApp Business tasks via Rube MCP... |
| [automation](../../skills/automation/SKILL.md) | Programming | 'Provides Automate ActiveCampaign tasks via Rube MCP... |
| [automation](../../skills/automation/SKILL.md) | Programming | 'Provides Automate Amplitude tasks via Rube MCP (Composio):... |
| [automation](../../skills/automation/SKILL.md) | Programming | 'Provides Automate Asana tasks via Rube MCP (Composio):... |
| [automation](../../skills/automation/SKILL.md) | Programming | 'Provides Automate BambooHR tasks via Rube MCP (Composio):... |
| [automation](../../skills/automation/SKILL.md) | Programming | "Provides Automate Basecamp project management, to-dos,... |
| [automation](../../skills/automation/SKILL.md) | Programming | "Provides Master automated billing systems including... |
| [automation](../../skills/automation/SKILL.md) | Programming | "Provides Automate Box operations including file... |
| [automation](../../skills/automation/SKILL.md) | Programming | "Provides Automate Brevo (formerly Sendinblue) email... |
| [automation](../../skills/automation/SKILL.md) | Programming | "Provides Automate Calendly scheduling, event management,... |
| [automation](../../skills/automation/SKILL.md) | Programming | 'Provides Automate Canva tasks via Rube MCP (Composio):... |
| [automation](../../skills/automation/SKILL.md) | Programming | 'Provides Automate Close CRM tasks via Rube MCP (Composio):... |
| [automation](../../skills/automation/SKILL.md) | Programming | 'Provides Automate Coda tasks via Rube MCP (Composio):... |
| [automation](../../skills/automation/SKILL.md) | Programming | "Provides Automate Confluence page creation, content... |
| [automation](../../skills/automation/SKILL.md) | Programming | 'Provides Automate ConvertKit (Kit) tasks via Rube MCP... |
| [automation](../../skills/automation/SKILL.md) | Programming | 'Provides Automate DocuSign tasks via Rube MCP (Composio):... |
| [automation](../../skills/automation/SKILL.md) | Programming | "Provides Automate Dropbox file management, sharing,... |
| [automation](../../skills/automation/SKILL.md) | Programming | 'Provides Automate Figma tasks via Rube MCP (Composio):... |
| [automation](../../skills/automation/SKILL.md) | Programming | 'Provides Automate Freshservice ITSM tasks via Rube MCP... |
| [automation](../../skills/automation/SKILL.md) | Programming | "Provides Lightweight Gmail integration with standalone... |
| [automation](../../skills/automation/SKILL.md) | Programming | "Provides Automate Google Sheets operations (read, write,... |
| [automation](../../skills/automation/SKILL.md) | Programming | 'Provides Automate Instagram tasks via Rube MCP (Composio):... |
| [automation](../../skills/automation/SKILL.md) | Programming | 'Provides Automate Jira tasks via Rube MCP (Composio):... |
| [automation](../../skills/automation/SKILL.md) | Programming | 'Provides Automate Klaviyo tasks via Rube MCP (Composio):... |
| [automation](../../skills/automation/SKILL.md) | Programming | 'Provides Automate Linear tasks via Rube MCP (Composio):... |
| [automation](../../skills/automation/SKILL.md) | Programming | 'Provides Automate LinkedIn tasks via Rube MCP (Composio):... |
| [automation](../../skills/automation/SKILL.md) | Programming | "Provides Automate Mailchimp email marketing including... |
| [automation](../../skills/automation/SKILL.md) | Programming | 'Provides Automate Miro tasks via Rube MCP (Composio):... |
| [automation](../../skills/automation/SKILL.md) | Programming | 'Provides Automate Mixpanel tasks via Rube MCP (Composio):... |
| [automation](../../skills/automation/SKILL.md) | Programming | "Provides Automate Monday.com work management including... |
| [automation](../../skills/automation/SKILL.md) | Programming | "Provides Automate Pipedrive CRM operations including... |
| [automation](../../skills/automation/SKILL.md) | Programming | 'Provides Automate PostHog tasks via Rube MCP (Composio):... |
| [automation](../../skills/automation/SKILL.md) | Programming | 'Provides Automate Reddit tasks via Rube MCP (Composio):... |
| [automation](../../skills/automation/SKILL.md) | Programming | 'Provides Automate Segment tasks via Rube MCP (Composio):... |
| [automation](../../skills/automation/SKILL.md) | Programming | "Provides Automate Supabase database queries, table... |
| [automation](../../skills/automation/SKILL.md) | Programming | 'Provides Automate TikTok tasks via Rube MCP (Composio):... |
| [automation](../../skills/automation/SKILL.md) | Programming | "Provides Automate Todoist task management, projects,... |
| [automation](../../skills/automation/SKILL.md) | Programming | "Provides Automate Trello boards, cards, and workflows via... |
| [automation](../../skills/automation/SKILL.md) | Programming | 'Provides Automate Twitter/X tasks via Rube MCP (Composio):... |
| [automation](../../skills/automation/SKILL.md) | Programming | 'Provides Automate Vercel tasks via Rube MCP (Composio):... |
| [automation](../../skills/automation/SKILL.md) | Programming | "Provides Automate Webflow CMS collections, site... |
| [automation](../../skills/automation/SKILL.md) | Programming | 'Provides Automate Wrike project management via Rube MCP... |
| [automation](../../skills/automation/SKILL.md) | Programming | 'Provides Automate YouTube tasks via Rube MCP (Composio):... |
| [automation-demo](../../skills/automation-demo/SKILL.md) | Coding | "Demonstrates the skill automation system with pre-commit... |
| [automation-workflow-automate](../../skills/automation-workflow-automate/SKILL.md) | Agent | Provides You are a workflow automation expert specializing... |
| [automator](../../skills/automator/SKILL.md) | Programming | "Provides Draft cold emails, follow-ups, and proposal... |
| [avaliacao](../../skills/avaliacao/SKILL.md) | Programming | "Provides Avaliacao pericial de imoveis em leilao. Valor de... |
| [aversion-designer](../../skills/aversion-designer/SKILL.md) | Programming | "Provides one sentence - what this skill does and when to... |
| [aws-modules](../../skills/aws-modules/SKILL.md) | Cncf | "Provides Terraform module creation for AWS — reusable... |
| [axiom](../../skills/axiom/SKILL.md) | Programming | "Provides First-principles assumption auditor. Classifies... |
| [azure-webjobs-extensions-authentication-events-dotnet](../../skills/azure-webjobs-extensions-authentication-events-dotnet/SKILL.md) | Cncf | "Provides Microsoft Entra Authentication Events SDK for... |
| [backend](../../skills/backend/SKILL.md) | Coding | "Provides Build ASP.NET Core 8+ backend services with EF... |
| [backend](../../skills/backend/SKILL.md) | Programming | "Provides Functional programming patterns for Node.js/Deno... |
| [backend-patterns](../../skills/backend-patterns/SKILL.md) | Coding | "Provides Master C#/.NET patterns for building... |
| [backend-patterns](../../skills/backend-patterns/SKILL.md) | Coding | "Provides Comprehensive guidance for building scalable,... |
| [backtest-drawdown-analysis](../../skills/backtest-drawdown-analysis/SKILL.md) | Trading | "Implements maximum drawdown, recovery time, and... |
| [backtest-lookahead-bias](../../skills/backtest-lookahead-bias/SKILL.md) | Trading | "Preventing lookahead bias in backtesting through strict... |
| [backtest-position-exits](../../skills/backtest-position-exits/SKILL.md) | Trading | "Exit strategies, trailing stops, and take-profit... |
| [backtest-position-sizing](../../skills/backtest-position-sizing/SKILL.md) | Trading | "'Position Sizing Algorithms: Fixed Fractional, Kelly... |
| [backtest-sharpe-ratio](../../skills/backtest-sharpe-ratio/SKILL.md) | Trading | "Provides Sharpe Ratio Calculation and Risk-Adjusted... |
| [backtest-walk-forward](../../skills/backtest-walk-forward/SKILL.md) | Trading | "Implements walk-forward optimization for robust strategy... |
| [backup-strategy](../../skills/backup-strategy/SKILL.md) | Programming | 'Provides Complete Odoo backup and restore strategy:... |
| [base](../../skills/base/SKILL.md) | Cncf | Provides Database management, forms, reports, and data... |
| [bases](../../skills/bases/SKILL.md) | Programming | Provides Create and edit Obsidian Bases (.base files) with... |
| [basics](../../skills/basics/SKILL.md) | Programming | "CRITICAL: Use for Makepad getting started and app... |
| [batch-refactor](../../skills/batch-refactor/SKILL.md) | Programming | "Provides Plan and execute large refactors with... |
| [bd-agent](../../skills/bd-agent/SKILL.md) | Programming | "Provides Production-tested patterns for building AI agents... |
| [behavioral-xray](../../skills/behavioral-xray/SKILL.md) | Agent | "Provides X-ray any AI model's behavioral patterns —... |
| [best-practices](../../skills/best-practices/SKILL.md) | Cncf | Provides CloudFormation template optimization, nested... |
| [best-practices](../../skills/best-practices/SKILL.md) | Cncf | Provides Postgres performance optimization and best... |
| [best-practices](../../skills/best-practices/SKILL.md) | Coding | Provides Next.js App Router principles. Server Components,... |
| [best-practices](../../skills/best-practices/SKILL.md) | Coding | "Provides Node.js development principles and... |
| [best-practices](../../skills/best-practices/SKILL.md) | Programming | "Provides Angular performance optimization and best... |
| [best-practices](../../skills/best-practices/SKILL.md) | Programming | "Provides Comprehensive performance optimization guide for... |
| [best-practices](../../skills/best-practices/SKILL.md) | Programming | "Provides best practices for remotion - video creation in... |
| [biopython](../../skills/biopython/SKILL.md) | Programming | "Provides Biopython is a comprehensive set of freely... |
| [blockrun](../../skills/blockrun/SKILL.md) | Programming | "Provides blockrun works with claude code and google... |
| [bot-architect](../../skills/bot-architect/SKILL.md) | Programming | "Provides Specialized skill for building production-ready... |
| [bot-builder](../../skills/bot-builder/SKILL.md) | Cncf | "Provides Build Slack apps using the Bolt framework across... |
| [bot-builder](../../skills/bot-builder/SKILL.md) | Cncf | "Provides Expert in building Telegram bots that solve real... |
| [brainstorming](../../skills/brainstorming/SKILL.md) | Programming | "Provides use before creative or constructive work... |
| [brand-reputation-monitoring](../../skills/brand-reputation-monitoring/SKILL.md) | Agent | Provides Scrape reviews, ratings, and brand mentions from... |
| [browser-automation](../../skills/browser-automation/SKILL.md) | Coding | "Provides AI-powered browser automation — navigate sites,... |
| [brutalist-ui](../../skills/brutalist-ui/SKILL.md) | Coding | Provides use when creating raw industrial or tactical... |
| [buffett](../../skills/buffett/SKILL.md) | Programming | "Provides Agente que simula Warren Buffett — o maior... |
| [build](../../skills/build/SKILL.md) | Programming | "Provides Build, maintain, and extend the EarLLM One... |
| [build-optimization](../../skills/build-optimization/SKILL.md) | Programming | "Provides Optimize Bazel builds for large-scale monorepos.... |
| [builder](../../skills/builder/SKILL.md) | Agent | Provides Create MCP (Model Context Protocol) servers that... |
| [builder](../../skills/builder/SKILL.md) | Programming | Provides Main application building orchestrator. Creates... |
| [builder](../../skills/builder/SKILL.md) | Programming | "Creates exhaustive technical references and API... |
| [builder-ms](../../skills/builder-ms/SKILL.md) | Agent | Provides use this skill when building mcp servers to... |
| [bukkit-pro](../../skills/bukkit-pro/SKILL.md) | Programming | "Provides Master Minecraft server plugin development with... |
| [bulletmind](../../skills/bulletmind/SKILL.md) | Programming | "Provides Convert input into clean, structured,... |
| [business-analyst-business-case](../../skills/business-analyst-business-case/SKILL.md) | Programming | "Generate comprehensive investor-ready business case... |
| [business-analyst-financial-projections](../../skills/business-analyst-financial-projections/SKILL.md) | Programming | "Create detailed 3-5 year financial model with revenue,... |
| [business-analyst-market-opportunity](../../skills/business-analyst-market-opportunity/SKILL.md) | Programming | "Generate comprehensive market opportunity analysis with... |
| [buttercup](../../skills/buttercup/SKILL.md) | Programming | "Provides All pods run in namespace crs. Use when pods in... |
| [caching](../../skills/caching/SKILL.md) | Programming | Provides Caching strategies for LLM prompts including... |
| [caching](../../skills/caching/SKILL.md) | Programming | "Provides Configure Turborepo for efficient monorepo builds... |
| [calc](../../skills/calc/SKILL.md) | Programming | "Provides Spreadsheet creation, format conversion... |
| [calendar-automation](../../skills/calendar-automation/SKILL.md) | Agent | 'Provides Automate Outlook Calendar tasks via Rube MCP... |
| [calendar-automation](../../skills/calendar-automation/SKILL.md) | Programming | "Provides Lightweight Google Calendar integration with... |
| [calibrator](../../skills/calibrator/SKILL.md) | Programming | "Provides one sentence - what this skill does and when to... |
| [call-handoff-patterns](../../skills/call-handoff-patterns/SKILL.md) | Cncf | Provides Effective patterns for on-call shift transitions,... |
| [cannibalization-detector](../../skills/cannibalization-detector/SKILL.md) | Programming | "Analyzes multiple provided pages to identify keyword... |
| [canvas](../../skills/canvas/SKILL.md) | Programming | "Provides Create and edit JSON Canvas files (.canvas) with... |
| [canvas-architect](../../skills/canvas-architect/SKILL.md) | Programming | "Provides Iterative consultant agent for building and... |
| [card](../../skills/card/SKILL.md) | Programming | "Provides 生成紧急情况下快速访 问的医疗信息摘要卡片。当用户 需要旅行、就诊准备、紧急情况 或询问... |
| [carlo-monitor-creation](../../skills/carlo-monitor-creation/SKILL.md) | Programming | "Guides creation of Monte Carlo monitors via MCP tools,... |
| [carlo-prevent](../../skills/carlo-prevent/SKILL.md) | Programming | Provides Surfaces Monte Carlo data observability context... |
| [carlo-push-ingestion](../../skills/carlo-push-ingestion/SKILL.md) | Programming | Provides Expert guide for pushing metadata, lineage, and... |
| [carlo-validation-notebook](../../skills/carlo-validation-notebook/SKILL.md) | Programming | Generates SQL validation notebooks for dbt PR changes with... |
| [cdp](../../skills/cdp/SKILL.md) | Programming | Provides Expert patterns for Segment Customer Data Platform... |
| [centric-high-seo-optimized-blogwriting-skill](../../skills/centric-high-seo-optimized-blogwriting-skill/SKILL.md) | Programming | "Provides use this skill when the user asks to write a blog... |
| [chain-risk-auditor](../../skills/chain-risk-auditor/SKILL.md) | Programming | "Provides Identifies dependencies at heightened risk of... |
| [change-tracker](../../skills/change-tracker/SKILL.md) | Programming | "Provides Track code changes with structured JSON records,... |
| [changelog](../../skills/changelog/SKILL.md) | Programming | "Provides Generate structured changelogs from git history.... |
| [channel-factories](../../skills/channel-factories/SKILL.md) | Programming | "Provides Technical reference on Lightning Network channel... |
| [chart-scaffolding](../../skills/chart-scaffolding/SKILL.md) | Cncf | Provides Comprehensive guidance for creating, organizing,... |
| [chat-agent-discovery](../../skills/chat-agent-discovery/SKILL.md) | Programming | "Provides Discover and search 18K+ MCP servers and AI... |
| [check](../../skills/check/SKILL.md) | Programming | "Provides Validate Claude Code skills against the... |
| [chinese](../../skills/chinese/SKILL.md) | Programming | "Provides Detect and rewrite AI-like Chinese text with a... |
| [cicd-workflows](../../skills/cicd-workflows/SKILL.md) | Programming | "Provides Helps understand and write EAS workflow YAML... |
| [cirq](../../skills/cirq/SKILL.md) | Programming | "Provides Cirq is Google Quantum AI's open-source framework... |
| [claude-skill](../../skills/claude-skill/SKILL.md) | Programming | "Provides manage linear issues, projects, and teams... |
| [cleanup-deps-audit](../../skills/cleanup-deps-audit/SKILL.md) | Programming | "Provides You are a dependency security expert specializing... |
| [cleanup-refactor-clean](../../skills/cleanup-refactor-clean/SKILL.md) | Programming | "Provides You are a code refactoring expert specializing in... |
| [cli](../../skills/cli/SKILL.md) | Programming | "Provides GDB debugging assistant for AI agents - analyze... |
| [cli](../../skills/cli/SKILL.md) | Programming | 'Provides use when automating linkedin via cli: fetch... |
| [cli](../../skills/cli/SKILL.md) | Programming | "Provides use mmx to generate text, images, video, speech,... |
| [cli](../../skills/cli/SKILL.md) | Programming | "Provides use the obsidian cli to read, create, search, and... |
| [cli](../../skills/cli/SKILL.md) | Programming | "Provides Semantic file discovery via `vexor`. Use whenever... |
| [clipper-template-creator](../../skills/clipper-template-creator/SKILL.md) | Programming | "Provides Guide for creating templates for the Obsidian Web... |
| [cloud-api](../../skills/cloud-api/SKILL.md) | Coding | "Provides Integracao com WhatsApp Business Cloud API... |
| [cloud-architect](../../skills/cloud-architect/SKILL.md) | Cncf | "Provides Expert hybrid cloud architect specializing in... |
| [cloud-architecture](../../skills/cloud-architecture/SKILL.md) | Cncf | "Provides Decision framework and patterns for architecting... |
| [cloud-networking](../../skills/cloud-networking/SKILL.md) | Cncf | "Provides Configure secure, high-performance connectivity... |
| [cloud-optimization-cost-optimize](../../skills/cloud-optimization-cost-optimize/SKILL.md) | Cncf | Provides You are a cloud cost optimization expert... |
| [cloud-run](../../skills/cloud-run/SKILL.md) | Cncf | "Provides Specialized skill for building production-ready... |
| [coach](../../skills/coach/SKILL.md) | Programming | "Provides Full job search coaching system — JD decoding,... |
| [coauthoring](../../skills/coauthoring/SKILL.md) | Programming | "Provides this skill provides a structured workflow for... |
| [code](../../skills/code/SKILL.md) | Coding | "Provides Expert C4 Code-level documentation specialist.... |
| [code](../../skills/code/SKILL.md) | Programming | "Provides Generate React code with Rayden UI components... |
| [code](../../skills/code/SKILL.md) | Programming | "Provides Review a diff for clarity and safe... |
| [code-audit](../../skills/code-audit/SKILL.md) | Coding | "Provides Autonomously deep-scan entire codebase... |
| [code-expert](../../skills/code-expert/SKILL.md) | Programming | Provides Especialista profundo em Claude Code - CLI da... |
| [code-guide](../../skills/code-guide/SKILL.md) | Programming | Provides To provide a comprehensive reference for... |
| [code-javascript](../../skills/code-javascript/SKILL.md) | Agent | Provides Write JavaScript code in n8n Code nodes. Use when... |
| [code-python](../../skills/code-python/SKILL.md) | Agent | Provides Write Python code in n8n Code nodes. Use when... |
| [code-quality-policies](../../skills/code-quality-policies/SKILL.md) | Coding | "Provides Establishing policies for maintaining a clean... |
| [code-review](../../skills/code-review/SKILL.md) | Coding | "Analyzes code diffs and files to identify bugs, security... |
| [code-validation](../../skills/code-validation/SKILL.md) | Coding | Validates pipeline stages and returns config status strings... |
| [collaboration-issue](../../skills/collaboration-issue/SKILL.md) | Programming | "Provides You are a GitHub issue resolution expert... |
| [collaboration-standup-notes](../../skills/collaboration-standup-notes/SKILL.md) | Programming | "Provides You are an expert team communication specialist... |
| [com-automation](../../skills/com-automation/SKILL.md) | Programming | 'Provides Automate Cal.com tasks via Rube MCP (Composio):... |
| [comms](../../skills/comms/SKILL.md) | Programming | "Provides Write internal communications such as status... |
| [comms-anthropic](../../skills/comms-anthropic/SKILL.md) | Programming | 'Provides to write internal communications, use this skill... |
| [comms-community](../../skills/comms-community/SKILL.md) | Programming | 'Provides to write internal communications, use this skill... |
| [communication-callautomation-java](../../skills/communication-callautomation-java/SKILL.md) | Cncf | "Provides Build server-side call automation workflows... |
| [communication-callingserver-java](../../skills/communication-callingserver-java/SKILL.md) | Cncf | "Provides ⚠️ DEPRECATED: This SDK has been renamed to Call ... |
| [communication-chat-java](../../skills/communication-chat-java/SKILL.md) | Cncf | "Provides Build real-time chat applications with thread... |
| [communication-common-java](../../skills/communication-common-java/SKILL.md) | Cncf | "Provides Azure Communication Services common utilities for... |
| [communication-sms-java](../../skills/communication-sms-java/SKILL.md) | Cncf | "Provides Send SMS messages with Azure Communication... |
| [communications](../../skills/communications/SKILL.md) | Cncf | 'Provides Build communication features with Twilio: SMS... |
| [competitor-intelligence](../../skills/competitor-intelligence/SKILL.md) | Agent | Provides Analyze competitor strategies, content, pricing,... |
| [competitor-pages](../../skills/competitor-pages/SKILL.md) | Programming | "Provides Generate SEO-optimized competitor comparison and... |
| [compliance-accessibility-audit](../../skills/compliance-accessibility-audit/SKILL.md) | Programming | "Provides You are an accessibility expert specializing in... |
| [component](../../skills/component/SKILL.md) | Coding | "Provides Expert C4 Component-level documentation... |
| [component](../../skills/component/SKILL.md) | Programming | "Provides Generate a new UI component that follows... |
| [component-performance](../../skills/component-performance/SKILL.md) | Programming | Provides Diagnose slow React components and suggest... |
| [components](../../skills/components/SKILL.md) | Programming | "Provides Core component library and design system... |
| [components-content](../../skills/components-content/SKILL.md) | Programming | "Provides Apple Human Interface Guidelines for content... |
| [components-controls](../../skills/components-controls/SKILL.md) | Programming | "Provides Check for .claude/apple-design-context.md before... |
| [components-dialogs](../../skills/components-dialogs/SKILL.md) | Programming | "Provides Apple HIG guidance for presentation components... |
| [components-layout](../../skills/components-layout/SKILL.md) | Programming | "Provides Apple Human Interface Guidelines for layout and... |
| [components-menus](../../skills/components-menus/SKILL.md) | Programming | "Provides Check for .claude/apple-design-context.md before... |
| [components-search](../../skills/components-search/SKILL.md) | Programming | "Provides Apple HIG guidance for navigation-related... |
| [components-status](../../skills/components-status/SKILL.md) | Programming | "Provides Apple HIG guidance for status and progress UI... |
| [components-system](../../skills/components-system/SKILL.md) | Programming | 'Provides Apple HIG guidance for system experience... |
| [composition-analysis](../../skills/composition-analysis/SKILL.md) | Programming | "Provides Design optimal team structures, hiring plans,... |
| [compression](../../skills/compression/SKILL.md) | Programming | Implements when agent sessions generate millions of tokens... |
| [compute-batch-java](../../skills/compute-batch-java/SKILL.md) | Cncf | "Provides Azure Batch SDK for Java. Run large-scale... |
| [concurrency-expert](../../skills/concurrency-expert/SKILL.md) | Programming | "Provides Review and fix Swift concurrency issues such as... |
| [concurrency-patterns](../../skills/concurrency-patterns/SKILL.md) | Programming | "Provides Master Go concurrency with goroutines, channels,... |
| [configuration](../../skills/configuration/SKILL.md) | Programming | Provides Complete guide to Prometheus setup, metric... |
| [configurator](../../skills/configurator/SKILL.md) | Cncf | "Provides Generate production-ready mise.toml setups for... |
| [constitution-analyzer](../../skills/constitution-analyzer/SKILL.md) | Programming | "Provides 分析中医体质数据、识 别体质类型、评估体质特征,并提 供个性化养生建议。支持与营养... |
| [container](../../skills/container/SKILL.md) | Coding | "Implements expert c4 container-level documentation... |
| [containerregistry-py](../../skills/containerregistry-py/SKILL.md) | Cncf | "Provides Azure Container Registry SDK for Python. Use for... |
| [content](../../skills/content/SKILL.md) | Programming | "Provides Content quality and E-E-A-T analysis with AI... |
| [content](../../skills/content/SKILL.md) | Programming | "Provides You are an expert social media strategist with... |
| [content-analytics](../../skills/content-analytics/SKILL.md) | Agent | Provides Track engagement metrics, measure campaign ROI,... |
| [content-auditor](../../skills/content-auditor/SKILL.md) | Programming | "Analyzes provided content for quality, E-E-A-T signals,... |
| [content-planner](../../skills/content-planner/SKILL.md) | Programming | "Creates comprehensive content outlines and topic clusters... |
| [content-refresher](../../skills/content-refresher/SKILL.md) | Programming | "Provides Identifies outdated elements in provided content... |
| [content-writer](../../skills/content-writer/SKILL.md) | Programming | "Provides Writes SEO-optimized content based on provided... |
| [context](../../skills/context/SKILL.md) | Agent | "Provides use for file-based context management, dynamic... |
| [context](../../skills/context/SKILL.md) | Coding | "Provides Expert C4 Context-level documentation specialist.... |
| [context-building](../../skills/context-building/SKILL.md) | Agent | "Enables ultra-granular, line-by-line code analysis to... |
| [context-mapping](../../skills/context-mapping/SKILL.md) | Coding | "Provides Map relationships between bounded contexts and... |
| [contract-templates](../../skills/contract-templates/SKILL.md) | Programming | "Provides Templates and patterns for creating legally sound... |
| [convex](../../skills/convex/SKILL.md) | Coding | 'Provides Convex reactive backend expert: schema design,... |
| [conviction-scoring](../../skills/conviction-scoring/SKILL.md) | Coding | "Multi-factor conviction scoring engine combining... |
| [copy](../../skills/copy/SKILL.md) | Programming | "Provides Generate UX microcopy in StyleSeed's... |
| [copywriting](../../skills/copywriting/SKILL.md) | Programming | "Provides Write rigorous, conversion-focused marketing copy... |
| [core](../../skills/core/SKILL.md) | Agent | 'Provides Auri: assistente de voz inteligente (Alexa +... |
| [coroutines-expert](../../skills/coroutines-expert/SKILL.md) | Programming | "Provides Expert patterns for Kotlin Coroutines and Flow,... |
| [cortex-expert](../../skills/cortex-expert/SKILL.md) | Programming | "Provides Senior embedded software engineer specializing in... |
| [cosmos-db-py](../../skills/cosmos-db-py/SKILL.md) | Cncf | "Provides Build production-grade Azure Cosmos DB NoSQL... |
| [cosmos-java](../../skills/cosmos-java/SKILL.md) | Cncf | Provides Azure Cosmos DB SDK for Java. NoSQL database... |
| [cosmos-py](../../skills/cosmos-py/SKILL.md) | Cncf | Provides Azure Cosmos DB SDK for Python (NoSQL API). Use... |
| [cosmos-rust](../../skills/cosmos-rust/SKILL.md) | Cncf | Provides Azure Cosmos DB SDK for Rust (NoSQL API). Use for... |
| [cosmos-ts](../../skills/cosmos-ts/SKILL.md) | Cncf | Provides Azure Cosmos DB JavaScript/TypeScript SDK... |
| [cost-cleanup](../../skills/cost-cleanup/SKILL.md) | Cncf | "Configures automated cleanup of unused aws resources to... |
| [cost-optimizer](../../skills/cost-optimizer/SKILL.md) | Cncf | "Provides Comprehensive AWS cost analysis and optimization... |
| [creative](../../skills/creative/SKILL.md) | Programming | "Provides Create, iterate, and scale paid ad creative for... |
| [creator](../../skills/creator/SKILL.md) | Agent | "Provides To create new CLI skills following Anthropic's... |
| [creator](../../skills/creator/SKILL.md) | Programming | "Provides Professional-grade brand voice analysis, SEO... |
| [creator-ms](../../skills/creator-ms/SKILL.md) | Agent | "Provides Guide for creating effective skills for AI coding... |
| [crewai](../../skills/crewai/SKILL.md) | Programming | "Provides Expert in CrewAI - the leading role-based... |
| [criminal](../../skills/criminal/SKILL.md) | Programming | "Provides Advogado criminalista especializado em Maria da... |
| [crm-automation](../../skills/crm-automation/SKILL.md) | Programming | 'Provides Automate Zoho CRM tasks via Rube MCP (Composio):... |
| [cro](../../skills/cro/SKILL.md) | Programming | "Provides Optimize any form that is NOT signup or account... |
| [cro](../../skills/cro/SKILL.md) | Programming | "Provides You are an expert in user onboarding and... |
| [cro](../../skills/cro/SKILL.md) | Programming | "Provides Analyze and optimize individual pages for... |
| [cro](../../skills/cro/SKILL.md) | Programming | "Provides Create and optimize popups, modals, overlays,... |
| [crypto-wallet](../../skills/crypto-wallet/SKILL.md) | Programming | "Provides Crypto wallet management across 7 blockchains via... |
| [cve-dependency-management](../../skills/cve-dependency-management/SKILL.md) | Coding | "Provides Cybersecurity operations skill for automating... |
| [d3js-skill](../../skills/d3js-skill/SKILL.md) | Programming | Provides this skill provides guidance for creating... |
| [daily](../../skills/daily/SKILL.md) | Programming | "Provides documentation and capabilities reference for... |
| [darwin](../../skills/darwin/SKILL.md) | Programming | "Provides Darwinian idea evolution engine — toss rough... |
| [dashboard-design](../../skills/dashboard-design/SKILL.md) | Programming | "Provides Comprehensive patterns for designing effective... |
| [dashboard-html-jsp-custom-best-pratices](../../skills/dashboard-html-jsp-custom-best-pratices/SKILL.md) | Coding | "Provides this skill should be used when the user asks for... |
| [dashboards](../../skills/dashboards/SKILL.md) | Cncf | Provides Create and manage production-ready Grafana... |
| [data-alternative-data](../../skills/data-alternative-data/SKILL.md) | Trading | "Alternative data ingestion pipelines for trading signals... |
| [data-backfill-strategy](../../skills/data-backfill-strategy/SKILL.md) | Trading | "Provides Strategic data backfill for populating historical... |
| [data-candle-data](../../skills/data-candle-data/SKILL.md) | Trading | "OHLCV candle data processing, timeframe management, and... |
| [data-enrichment](../../skills/data-enrichment/SKILL.md) | Trading | "Provides Data enrichment techniques for adding context to... |
| [data-feature-store](../../skills/data-feature-store/SKILL.md) | Trading | "Provides Feature storage and management for machine... |
| [data-fetching](../../skills/data-fetching/SKILL.md) | Programming | Provides use when implementing or debugging any network... |
| [data-lake](../../skills/data-lake/SKILL.md) | Trading | "Provides Data lake architecture and management for trading... |
| [data-normalization](../../skills/data-normalization/SKILL.md) | Coding | 'Provides Exchange data normalization layer: typed... |
| [data-order-book](../../skills/data-order-book/SKILL.md) | Trading | "Order book data handling, spread calculation, liquidity... |
| [data-stream-processing](../../skills/data-stream-processing/SKILL.md) | Trading | "Provides Streaming data processing for real-time trading... |
| [data-tables-java](../../skills/data-tables-java/SKILL.md) | Cncf | "Provides Build table storage applications using the Azure... |
| [data-tables-py](../../skills/data-tables-py/SKILL.md) | Cncf | "Provides Azure Tables SDK for Python (Storage and Cosmos... |
| [data-time-series-database](../../skills/data-time-series-database/SKILL.md) | Trading | "Provides Time-series database queries and optimization for... |
| [data-transforms](../../skills/data-transforms/SKILL.md) | Programming | Provides Everyday data transformations using functional... |
| [data-validation](../../skills/data-validation/SKILL.md) | Trading | "Provides Data validation and quality assurance for trading... |
| [database](../../skills/database/SKILL.md) | Agent | Provides Database development and operations workflow... |
| [database](../../skills/database/SKILL.md) | Coding | "Provides Direct REST API access to PubMed. Advanced... |
| [database](../../skills/database/SKILL.md) | Coding | Provides Direct REST API access to UniProt. Protein... |
| [database-engineer](../../skills/database-engineer/SKILL.md) | Programming | Provides Expert in vector databases, embedding strategies,... |
| [database-pentesting](../../skills/database-pentesting/SKILL.md) | Cncf | "Provides Provide systematic methodologies for automated... |
| [database-query](../../skills/database-query/SKILL.md) | Programming | Provides food database query functionality and capabilities. |
| [dataforseo](../../skills/dataforseo/SKILL.md) | Programming | Provides use dataforseo for live serps, keyword metrics,... |
| [debugger](../../skills/debugger/SKILL.md) | Coding | "Debugging specialist for errors, test failures, and... |
| [debugger-agent](../../skills/debugger-agent/SKILL.md) | Programming | "Provides Debug the current iOS project on a booted... |
| [debugging](../../skills/debugging/SKILL.md) | Coding | "Provides use when encountering any bug, test failure, or... |
| [debugging-debug-trace](../../skills/debugging-debug-trace/SKILL.md) | Cncf | Provides You are a debugging expert specializing in setting... |
| [debugging-error-analysis](../../skills/debugging-error-analysis/SKILL.md) | Programming | "Provides You are an expert error analysis specialist with... |
| [debugging-error-trace](../../skills/debugging-error-trace/SKILL.md) | Programming | "Provides You are an error tracking and observability... |
| [debugging-multi-agent-review](../../skills/debugging-multi-agent-review/SKILL.md) | Programming | "Provides use when working with error debugging multi agent... |
| [decision-records](../../skills/decision-records/SKILL.md) | Coding | "Provides Comprehensive patterns for creating, maintaining,... |
| [defensive-patterns](../../skills/defensive-patterns/SKILL.md) | Programming | "Provides Master defensive Bash programming techniques for... |
| [defuddle](../../skills/defuddle/SKILL.md) | Programming | "Provides Extract clean markdown content from web pages... |
| [degradation](../../skills/degradation/SKILL.md) | Programming | Provides Language models exhibit predictable degradation... |
| [demand-planning](../../skills/demand-planning/SKILL.md) | Programming | "Provides Codified expertise for demand forecasting, safety... |
| [deploy](../../skills/deploy/SKILL.md) | Cncf | "Provides DevOps e deploy de aplicacoes — Docker, CI/CD com... |
| [deployment](../../skills/deployment/SKILL.md) | Agent | Provides Kubernetes deployment workflow for container... |
| [deployment](../../skills/deployment/SKILL.md) | Cncf | Provides Deploy containerized frontend + backend... |
| [deployment](../../skills/deployment/SKILL.md) | Programming | Provides deploy expo apps to production functionality and... |
| [deployment](../../skills/deployment/SKILL.md) | Programming | "CRITICAL: Use for Makepad packaging and deployment.... |
| [deployment](../../skills/deployment/SKILL.md) | Programming | Provides expert knowledge for deploying to vercel with... |
| [design](../../skills/design/SKILL.md) | Cncf | Provides Database design principles and decision-making.... |
| [design](../../skills/design/SKILL.md) | Coding | "Provides You are a frontend designer-engineer, not a... |
| [design](../../skills/design/SKILL.md) | Programming | "Provides These are instructions for creating design... |
| [design](../../skills/design/SKILL.md) | Programming | "Provides Game design principles. GDD structure, balancing,... |
| [design](../../skills/design/SKILL.md) | Programming | "Provides (mobile-first · touch-first ·... |
| [design](../../skills/design/SKILL.md) | Programming | "Provides Design de produto nivel Apple — sistemas visuais,... |
| [design](../../skills/design/SKILL.md) | Programming | Provides Build tools that agents can use effectively,... |
| [design-expert](../../skills/design-expert/SKILL.md) | Programming | "Provides Core UI/UX engineering skill for building highly... |
| [design-guidelines](../../skills/design-guidelines/SKILL.md) | Programming | "Provides review files for compliance with web interface... |
| [design-principles](../../skills/design-principles/SKILL.md) | Coding | "Provides Master REST and GraphQL API design principles to... |
| [design-system](../../skills/design-system/SKILL.md) | Programming | "Provides Build production-ready design systems with... |
| [design-taste](../../skills/design-taste/SKILL.md) | Coding | "Provides use when generating google stitch design.md... |
| [detective](../../skills/detective/SKILL.md) | Programming | "Provides Search logs and codebases for error patterns,... |
| [dev-client](../../skills/dev-client/SKILL.md) | Programming | "Provides Build and distribute Expo development clients... |
| [dev-guidelines](../../skills/dev-guidelines/SKILL.md) | Coding | "Provides You are a senior backend engineer operating... |
| [dev-guidelines](../../skills/dev-guidelines/SKILL.md) | Coding | "Provides You are a senior frontend engineer operating... |
| [dev-jobs-mcp](../../skills/dev-jobs-mcp/SKILL.md) | Agent | "Provides Search 8,400+ AI and ML jobs across 489... |
| [developer](../../skills/developer/SKILL.md) | Agent | "Provides Comprehensive guide for creating and managing... |
| [developer](../../skills/developer/SKILL.md) | Coding | "Provides Build React components, implement responsive... |
| [developer](../../skills/developer/SKILL.md) | Programming | "Provides Build production-ready Web3 applications, smart... |
| [developer](../../skills/developer/SKILL.md) | Programming | Provides Develop native iOS applications with... |
| [developer](../../skills/developer/SKILL.md) | Programming | "Provides Develop React Native, Flutter, or native mobile... |
| [developer](../../skills/developer/SKILL.md) | Programming | "Provides Build Unity games with optimized C# scripts,... |
| [development](../../skills/development/SKILL.md) | Agent | "Provides Comprehensive web, mobile, and backend... |
| [development](../../skills/development/SKILL.md) | Cncf | "Provides Expert patterns for Salesforce platform... |
| [development](../../skills/development/SKILL.md) | Cncf | "Provides Build Shopify apps, extensions, themes using... |
| [development](../../skills/development/SKILL.md) | Programming | "Provides Fast, modern JavaScript/TypeScript development... |
| [development](../../skills/development/SKILL.md) | Programming | "Provides Master Electron desktop app development with... |
| [development](../../skills/development/SKILL.md) | Programming | "Provides Game development orchestrator. Routes to... |
| [development](../../skills/development/SKILL.md) | Programming | Provides this skill covers the principles for identifying... |
| [development](../../skills/development/SKILL.md) | Programming | Provides Comprehensive Snowflake development assistant... |
| [development-feature-development](../../skills/development-feature-development/SKILL.md) | Coding | "Provides Orchestrate end-to-end backend feature... |
| [development-python-scaffold](../../skills/development-python-scaffold/SKILL.md) | Programming | "Provides You are a Python project architecture expert... |
| [devops](../../skills/devops/SKILL.md) | Agent | "Provides Cloud infrastructure and DevOps workflow covering... |
| [diagnostics-error-analysis](../../skills/diagnostics-error-analysis/SKILL.md) | Programming | "Provides You are an expert error analysis specialist with... |
| [diagnostics-error-trace](../../skills/diagnostics-error-trace/SKILL.md) | Programming | "Provides You are an error tracking and observability... |
| [diagnostics-smart-debug](../../skills/diagnostics-smart-debug/SKILL.md) | Programming | "Provides use when working with error diagnostics smart... |
| [diary](../../skills/diary/SKILL.md) | Agent | 'Provides Unified Diary System: A context-preserving... |
| [docker-deployment](../../skills/docker-deployment/SKILL.md) | Programming | Provides Production-ready Docker and docker-compose setup... |
| [docs-automation](../../skills/docs-automation/SKILL.md) | Agent | Provides Lightweight Google Docs integration with... |
| [documentation](../../skills/documentation/SKILL.md) | Agent | "Provides API documentation workflow for generating OpenAPI... |
| [documentation](../../skills/documentation/SKILL.md) | Agent | "Provides Documentation generation workflow covering API... |
| [documentation-code-explain](../../skills/documentation-code-explain/SKILL.md) | Programming | "Provides You are a code education expert specializing in... |
| [documentation-doc-generate](../../skills/documentation-doc-generate/SKILL.md) | Programming | "Provides You are a documentation expert specializing in... |
| [documentation-generator](../../skills/documentation-generator/SKILL.md) | Coding | "Provides Generate comprehensive, developer-friendly API... |
| [documenter](../../skills/documenter/SKILL.md) | Coding | "Provides Master API documentation with OpenAPI 3.1,... |
| [draw](../../skills/draw/SKILL.md) | Programming | "Provides Vector graphics and diagram creation, format... |
| [drive-automation](../../skills/drive-automation/SKILL.md) | Agent | Provides Lightweight Google Drive integration with... |
| [drive-automation](../../skills/drive-automation/SKILL.md) | Programming | "Provides Automate OneDrive file management, search,... |
| [driven-design](../../skills/driven-design/SKILL.md) | Coding | "Provides Plan and route Domain-Driven Design work from... |
| [driven-development](../../skills/driven-development/SKILL.md) | Programming | Provides Guide for implementing and maintaining context as... |
| [ds-ab-testing](../../skills/ds-ab-testing/SKILL.md) | Coding | Provides Designs and analyzes A/B tests including... |
| [ds-anomaly-detection](../../skills/ds-anomaly-detection/SKILL.md) | Coding | "Detects anomalies and outliers using isolation forests,... |
| [ds-association-rules](../../skills/ds-association-rules/SKILL.md) | Coding | "Provides Discovers association rules and frequent itemsets... |
| [ds-bayesian-inference](../../skills/ds-bayesian-inference/SKILL.md) | Coding | "Applies Bayesian methods for prior selection, posterior... |
| [ds-bias-variance-tradeoff](../../skills/ds-bias-variance-tradeoff/SKILL.md) | Coding | "Analyzes bias-variance tradeoff, overfitting,... |
| [ds-categorical-encoding](../../skills/ds-categorical-encoding/SKILL.md) | Coding | "Provides Encodes categorical variables using one-hot... |
| [ds-causal-inference](../../skills/ds-causal-inference/SKILL.md) | Coding | Implements causal models, directed acyclic graphs (DAGs),... |
| [ds-classification-metrics](../../skills/ds-classification-metrics/SKILL.md) | Coding | "Evaluates classification models using precision, recall,... |
| [ds-clustering](../../skills/ds-clustering/SKILL.md) | Coding | "Implements clustering algorithms including K-means,... |
| [ds-community-detection](../../skills/ds-community-detection/SKILL.md) | Coding | "Detects communities and clusters in graphs using... |
| [ds-confidence-intervals](../../skills/ds-confidence-intervals/SKILL.md) | Coding | "Provides Constructs confidence intervals using bootstrap,... |
| [ds-correlation-analysis](../../skills/ds-correlation-analysis/SKILL.md) | Coding | "Analyzes correlation, covariance, and multivariate... |
| [ds-cross-validation](../../skills/ds-cross-validation/SKILL.md) | Coding | "Implements k-fold cross-validation, stratified... |
| [ds-data-collection](../../skills/ds-data-collection/SKILL.md) | Coding | "Implements data gathering strategies including APIs, web... |
| [ds-data-ingestion](../../skills/ds-data-ingestion/SKILL.md) | Coding | "Provides Designs and implements ETL pipelines, streaming... |
| [ds-data-privacy](../../skills/ds-data-privacy/SKILL.md) | Coding | "Applies privacy-preserving techniques including... |
| [ds-data-profiling](../../skills/ds-data-profiling/SKILL.md) | Coding | Provides Extracts data profiles, schemas, metadata, and... |
| [ds-data-quality](../../skills/ds-data-quality/SKILL.md) | Coding | "Implements data validation, cleaning, outlier detection,... |
| [ds-data-versioning](../../skills/ds-data-versioning/SKILL.md) | Coding | "Implements data versioning, lineage tracking, provenance... |
| [ds-data-visualization](../../skills/ds-data-visualization/SKILL.md) | Coding | "Creates effective visualizations including plots, charts,... |
| [ds-dimensionality-reduction](../../skills/ds-dimensionality-reduction/SKILL.md) | Coding | "Provides Reduces data dimensionality using PCA, t-SNE,... |
| [ds-distribution-fitting](../../skills/ds-distribution-fitting/SKILL.md) | Coding | "Provides Fits statistical distributions to data using... |
| [ds-eda](../../skills/ds-eda/SKILL.md) | Coding | "Provides Performs exploratory data analysis using summary... |
| [ds-ensemble-methods](../../skills/ds-ensemble-methods/SKILL.md) | Coding | "Provides Combines multiple models using bagging, boosting,... |
| [ds-experimental-design](../../skills/ds-experimental-design/SKILL.md) | Coding | "Provides Designs experiments using design of experiments... |
| [ds-explainability](../../skills/ds-explainability/SKILL.md) | Coding | "Implements explainability and interpretability techniques... |
| [ds-feature-engineering](../../skills/ds-feature-engineering/SKILL.md) | Coding | "Creates and transforms features including polynomial... |
| [ds-feature-interaction](../../skills/ds-feature-interaction/SKILL.md) | Coding | "Provides Discovers and engineers feature interactions... |
| [ds-feature-scaling-normalization](../../skills/ds-feature-scaling-normalization/SKILL.md) | Coding | "Provides Scales and normalizes features using... |
| [ds-feature-selection](../../skills/ds-feature-selection/SKILL.md) | Coding | "Selects relevant features using univariate selection,... |
| [ds-hyperparameter-tuning](../../skills/ds-hyperparameter-tuning/SKILL.md) | Coding | "Optimizes hyperparameters using grid search, random... |
| [ds-hypothesis-testing](../../skills/ds-hypothesis-testing/SKILL.md) | Coding | Implements hypothesis testing including t-tests, chi-square... |
| [ds-instrumental-variables](../../skills/ds-instrumental-variables/SKILL.md) | Coding | "Provides Uses instrumental variables (IV), two-stage least... |
| [ds-intervention-analysis](../../skills/ds-intervention-analysis/SKILL.md) | Coding | "Provides Estimates treatment effects, conditional average... |
| [ds-kernel-density](../../skills/ds-kernel-density/SKILL.md) | Coding | "Implements kernel density estimation, non-parametric... |
| [ds-linear-regression](../../skills/ds-linear-regression/SKILL.md) | Coding | "Implements linear regression including OLS, ridge... |
| [ds-logistic-regression](../../skills/ds-logistic-regression/SKILL.md) | Coding | "Implements logistic regression for binary and multinomial... |
| [ds-maximum-likelihood](../../skills/ds-maximum-likelihood/SKILL.md) | Coding | Implements maximum likelihood estimation, likelihood... |
| [ds-metrics-and-kpis](../../skills/ds-metrics-and-kpis/SKILL.md) | Coding | "Defines, selects, and monitors key performance indicators... |
| [ds-missing-data](../../skills/ds-missing-data/SKILL.md) | Coding | "Handles missing data using imputation strategies, deletion... |
| [ds-model-fairness](../../skills/ds-model-fairness/SKILL.md) | Coding | "Evaluates and mitigates fairness issues including bias... |
| [ds-model-interpretation](../../skills/ds-model-interpretation/SKILL.md) | Coding | "Provides Interprets models using SHAP values, LIME,... |
| [ds-model-robustness](../../skills/ds-model-robustness/SKILL.md) | Coding | Improves model robustness including adversarial robustness,... |
| [ds-model-selection](../../skills/ds-model-selection/SKILL.md) | Coding | "Provides Compares and selects models using AIC, BIC,... |
| [ds-monte-carlo](../../skills/ds-monte-carlo/SKILL.md) | Coding | "Implements Monte Carlo sampling, simulation methods, and... |
| [ds-neural-networks](../../skills/ds-neural-networks/SKILL.md) | Coding | "Implements deep neural networks, backpropagation,... |
| [ds-observational-studies](../../skills/ds-observational-studies/SKILL.md) | Coding | "Analyzes observational data using matching methods,... |
| [ds-online-experiments](../../skills/ds-online-experiments/SKILL.md) | Coding | "Implements multi-armed bandits, contextual bandits,... |
| [ds-privacy-ml](../../skills/ds-privacy-ml/SKILL.md) | Coding | "Implements privacy-preserving machine learning including... |
| [ds-randomized-experiments](../../skills/ds-randomized-experiments/SKILL.md) | Coding | "Provides Designs and analyzes randomized controlled trials... |
| [ds-regression-evaluation](../../skills/ds-regression-evaluation/SKILL.md) | Coding | "Evaluates regression models using MSE, RMSE, MAE, MAPE,... |
| [ds-reproducible-research](../../skills/ds-reproducible-research/SKILL.md) | Coding | "Implements reproducible research practices including code... |
| [ds-statistical-power](../../skills/ds-statistical-power/SKILL.md) | Coding | "Analyzes statistical power, sample size determination,... |
| [ds-support-vector-machines](../../skills/ds-support-vector-machines/SKILL.md) | Coding | "Implements support vector machines (SVM) with kernel... |
| [ds-synthetic-control](../../skills/ds-synthetic-control/SKILL.md) | Coding | "Implements synthetic control methods,... |
| [ds-time-series-forecasting](../../skills/ds-time-series-forecasting/SKILL.md) | Coding | "Implements ARIMA, exponential smoothing, state-space... |
| [ds-topic-modeling](../../skills/ds-topic-modeling/SKILL.md) | Coding | "Implements topic modeling using Latent Dirichlet... |
| [ds-tree-methods](../../skills/ds-tree-methods/SKILL.md) | Coding | "Implements decision trees, random forests, gradient... |
| [dsl](../../skills/dsl/SKILL.md) | Programming | "CRITICAL: Use for Makepad DSL syntax and inheritance.... |
| [ecommerce](../../skills/ecommerce/SKILL.md) | Agent | Provides Extract product data, prices, reviews, and seller... |
| [ecommerce-configurator](../../skills/ecommerce-configurator/SKILL.md) | Programming | 'Provides Expert guide for Odoo eCommerce and Website:... |
| [ecs-expert](../../skills/ecs-expert/SKILL.md) | Programming | Provides Master Bevy's Entity Component System (ECS) in... |
| [ecs-patterns](../../skills/ecs-patterns/SKILL.md) | Programming | Provides Production patterns for Unity's Data-Oriented... |
| [edges](../../skills/edges/SKILL.md) | Programming | "Provides sharp-edges functionality and capabilities." |
| [edi-connector](../../skills/edi-connector/SKILL.md) | Programming | 'Provides Guide for implementing EDI (Electronic Data... |
| [edital](../../skills/edital/SKILL.md) | Programming | "Provides Analise e auditoria de editais de leilao judicial... |
| [editing](../../skills/editing/SKILL.md) | Programming | "Provides You are an expert copy editor specializing in... |
| [either-ref](../../skills/either-ref/SKILL.md) | Programming | "Provides Quick reference for Either type. Use when user... |
| [elite](../../skills/elite/SKILL.md) | Programming | "Provides Senior Elite Software Engineer (15+) and Senior... |
| [elite-gemini-high](../../skills/elite-gemini-high/SKILL.md) | Programming | "Provides Modo Elite Coder + UX Pixel-Perfect otimizado... |
| [email](../../skills/email/SKILL.md) | Programming | "Provides Write B2B cold emails and follow-up sequences... |
| [emotion-engineer](../../skills/emotion-engineer/SKILL.md) | Programming | "Provides one sentence - what this skill does and when to... |
| [enablement](../../skills/enablement/SKILL.md) | Programming | "Provides Create sales collateral such as decks,... |
| [end-visual-design](../../skills/end-visual-design/SKILL.md) | Coding | "Provides use when designing expensive agency-grade... |
| [endpoint-builder](../../skills/endpoint-builder/SKILL.md) | Programming | "Builds production-ready REST API endpoints with... |
| [engine](../../skills/engine/SKILL.md) | Programming | "Provides Motor de crescimento para produtos digitais --... |
| [engine-cpp-pro](../../skills/engine-cpp-pro/SKILL.md) | Coding | "Provides Expert guide for Unreal Engine 5.x C++... |
| [engineer](../../skills/engineer/SKILL.md) | Agent | Transforms user prompts into optimized prompts using... |
| [engineer](../../skills/engineer/SKILL.md) | Cncf | Provides Expert deployment engineer specializing in modern... |
| [engineer](../../skills/engineer/SKILL.md) | Cncf | Provides Build production-ready monitoring, logging, and... |
| [engineer](../../skills/engineer/SKILL.md) | Programming | Provides Build production-ready LLM applications, advanced... |
| [engineer](../../skills/engineer/SKILL.md) | Programming | Provides Build scalable data pipelines, modern data... |
| [engineer](../../skills/engineer/SKILL.md) | Programming | Provides Build production ML systems with PyTorch 2.x,... |
| [engineer](../../skills/engineer/SKILL.md) | Programming | Provides Build comprehensive ML pipelines, experiment... |
| [engineer](../../skills/engineer/SKILL.md) | Programming | "Provides Expert network engineer specializing in modern... |
| [engineer](../../skills/engineer/SKILL.md) | Programming | Provides Expert performance engineer specializing in modern... |
| [engineer](../../skills/engineer/SKILL.md) | Programming | Provides Expert in building Retrieval-Augmented Generation... |
| [engineer](../../skills/engineer/SKILL.md) | Programming | "Creates step-by-step tutorials and educational content... |
| [engineering](../../skills/engineering/SKILL.md) | Programming | Provides Expert guide on prompt engineering patterns, best... |
| [engineering-data-driven-feature](../../skills/engineering-data-driven-feature/SKILL.md) | Programming | "Provides Build features guided by data insights, A/B... |
| [engineering-data-pipeline](../../skills/engineering-data-pipeline/SKILL.md) | Programming | Provides You are a data pipeline architecture expert... |
| [engineering-patterns](../../skills/engineering-patterns/SKILL.md) | Programming | Provides Master advanced prompt engineering techniques to... |
| [engineering-toolkit](../../skills/engineering-toolkit/SKILL.md) | Programming | 'Provides 6 production-ready AI engineering workflows:... |
| [errors](../../skills/errors/SKILL.md) | Programming | "Provides Stop throwing everywhere - handle errors as... |
| [especialista](../../skills/especialista/SKILL.md) | Programming | 'Provides Advogado especialista em todas as areas do... |
| [estimation](../../skills/estimation/SKILL.md) | Programming | "Provides Estimate AI-assisted and hybrid human+agent... |
| [evaluation](../../skills/evaluation/SKILL.md) | Agent | "Provides Testing and benchmarking LLM agents including... |
| [evaluation](../../skills/evaluation/SKILL.md) | Programming | Provides this skill should be used when the user asks to... |
| [evaluation](../../skills/evaluation/SKILL.md) | Programming | Provides Build evaluation frameworks for agent systems. Use... |
| [evaluation](../../skills/evaluation/SKILL.md) | Programming | Provides Master comprehensive evaluation strategies for LLM... |
| [event-action](../../skills/event-action/SKILL.md) | Programming | "CRITICAL: Use for Makepad event and action handling.... |
| [event-action](../../skills/event-action/SKILL.md) | Programming | "CRITICAL: Use for Robius event and action patterns.... |
| [event-bus](../../skills/event-bus/SKILL.md) | Coding | "Async pub/sub event bus with typed events, mixed... |
| [event-driven-architecture](../../skills/event-driven-architecture/SKILL.md) | Coding | "'Event-driven architecture for real-time trading systems:... |
| [eventgrid-dotnet](../../skills/eventgrid-dotnet/SKILL.md) | Cncf | "Provides Azure Event Grid SDK for .NET. Client library for... |
| [eventgrid-java](../../skills/eventgrid-java/SKILL.md) | Cncf | "Provides Build event-driven applications with Azure Event... |
| [eventgrid-py](../../skills/eventgrid-py/SKILL.md) | Cncf | "Provides Azure Event Grid SDK for Python. Use for... |
| [eventhub-dotnet](../../skills/eventhub-dotnet/SKILL.md) | Cncf | "Configures azure event hubs sdk for .net for cloud-native... |
| [eventhub-java](../../skills/eventhub-java/SKILL.md) | Cncf | Provides Build real-time streaming applications with Azure... |
| [eventhub-py](../../skills/eventhub-py/SKILL.md) | Cncf | "Provides Azure Event Hubs SDK for Python streaming. Use... |
| [eventhub-rust](../../skills/eventhub-rust/SKILL.md) | Cncf | Provides Azure Event Hubs SDK for Rust. Use for sending and... |
| [eventhub-ts](../../skills/eventhub-ts/SKILL.md) | Cncf | Provides High-throughput event streaming and real-time data... |
| [evolution](../../skills/evolution/SKILL.md) | Programming | "Provides this skill enables makepad-skills to self-improve... |
| [exception-management](../../skills/exception-management/SKILL.md) | Programming | "Provides Codified expertise for handling freight... |
| [exchange-ccxt-patterns](../../skills/exchange-ccxt-patterns/SKILL.md) | Trading | "Effective patterns for using CCXT library for exchange... |
| [exchange-failover-handling](../../skills/exchange-failover-handling/SKILL.md) | Trading | "Provides Automated failover and redundancy management for... |
| [exchange-health](../../skills/exchange-health/SKILL.md) | Trading | "Provides Exchange system health monitoring and... |
| [exchange-market-data-cache](../../skills/exchange-market-data-cache/SKILL.md) | Trading | "High-performance caching layer for market data with low... |
| [exchange-order-book-sync](../../skills/exchange-order-book-sync/SKILL.md) | Trading | "Provides Order book synchronization and state management... |
| [exchange-order-execution-api](../../skills/exchange-order-execution-api/SKILL.md) | Trading | "Implements order execution and management api for trading... |
| [exchange-rate-limiting](../../skills/exchange-rate-limiting/SKILL.md) | Trading | "Rate Limiting Strategies and Circuit Breaker Patterns for... |
| [exchange-trade-reporting](../../skills/exchange-trade-reporting/SKILL.md) | Trading | "Real-time trade reporting and execution analytics for... |
| [exchange-websocket-handling](../../skills/exchange-websocket-handling/SKILL.md) | Trading | "Real-time market data handling with WebSockets including... |
| [exchange-websocket-streaming](../../skills/exchange-websocket-streaming/SKILL.md) | Trading | "Implements real-time market data streaming and processing... |
| [execution-order-book-impact](../../skills/execution-order-book-impact/SKILL.md) | Trading | "Provides Order Book Impact Measurement and Market... |
| [execution-rate-limiting](../../skills/execution-rate-limiting/SKILL.md) | Trading | "Provides Rate Limiting and Exchange API Management for... |
| [execution-slippage-modeling](../../skills/execution-slippage-modeling/SKILL.md) | Trading | "Slippage Estimation, Simulation, and Fee Modeling for... |
| [execution-twap](../../skills/execution-twap/SKILL.md) | Trading | "Time-Weighted Average Price algorithm for executing large... |
| [execution-twap-vwap](../../skills/execution-twap-vwap/SKILL.md) | Trading | 'Provides ''TWAP and VWAP Execution Algorithms:... |
| [execution-vwap](../../skills/execution-vwap/SKILL.md) | Trading | "Volume-Weighted Average Price algorithm for executing... |
| [existing-projects](../../skills/existing-projects/SKILL.md) | Coding | "Provides use when upgrading existing websites or apps by... |
| [experience](../../skills/experience/SKILL.md) | Coding | "Provides Expert in building immersive scroll-driven... |
| [expert](../../skills/expert/SKILL.md) | Cncf | Provides You are an advanced Docker containerization expert... |
| [expert](../../skills/expert/SKILL.md) | Cncf | Provides Expert guidance for distributed NoSQL databases... |
| [expert](../../skills/expert/SKILL.md) | Cncf | Provides You are an expert in Prisma ORM with deep... |
| [expert](../../skills/expert/SKILL.md) | Coding | "Provides Advanced .faf (Foundational AI-context Format)... |
| [expert](../../skills/expert/SKILL.md) | Coding | "Provides Senior Laravel Engineer role for... |
| [expert](../../skills/expert/SKILL.md) | Coding | "Provides You are an expert in Nest.js with deep knowledge... |
| [expert](../../skills/expert/SKILL.md) | Coding | "Provides TypeScript and JavaScript expert with deep... |
| [expert](../../skills/expert/SKILL.md) | Programming | "Provides expertise for analyzing DWARF debug files and... |
| [expert](../../skills/expert/SKILL.md) | Programming | "Provides Master Flutter development with Dart 3, advanced... |
| [expert](../../skills/expert/SKILL.md) | Programming | "Provides Expert advisor for ITIL 4 and ITIL 5 (2026... |
| [expert](../../skills/expert/SKILL.md) | Programming | "Provides Create Mermaid diagrams for flowcharts,... |
| [expert-skill](../../skills/expert-skill/SKILL.md) | Programming | "Provides Write, review, or improve SwiftUI code following... |
| [expo](../../skills/expo/SKILL.md) | Programming | "Provides upgrade expo sdk versions functionality and... |
| [express-wrapper](../../skills/express-wrapper/SKILL.md) | Coding | "Provides Wrapper oficial de M2MCent (Node.js) para... |
| [expression-syntax](../../skills/expression-syntax/SKILL.md) | Agent | Provides Validate n8n expression syntax and fix common... |
| [extension-builder](../../skills/extension-builder/SKILL.md) | Programming | "Provides Expert in building browser extensions that solve... |
| [extension-developer](../../skills/extension-developer/SKILL.md) | Coding | "Provides Expert in building Chrome Extensions using... |
| [extension-guide-en](../../skills/extension-guide-en/SKILL.md) | Programming | "Provides Guide for VS Code extension development from... |
| [external-api-development](../../skills/external-api-development/SKILL.md) | Cncf | "Provides this skill guides you through creating custom... |
| [extractor](../../skills/extractor/SKILL.md) | Programming | "Extracts up to 50 highly relevant SEO keywords from text.... |
| [face-cli](../../skills/face-cli/SKILL.md) | Programming | Provides use the hugging face hub cli (`hf`) to download,... |
| [face-community-evals](../../skills/face-community-evals/SKILL.md) | Programming | Provides Run local evaluations for Hugging Face Hub models... |
| [face-dataset-viewer](../../skills/face-dataset-viewer/SKILL.md) | Programming | Provides Query Hugging Face datasets through the Dataset... |
| [face-datasets](../../skills/face-datasets/SKILL.md) | Programming | Provides Create and manage datasets on Hugging Face Hub.... |
| [face-evaluation](../../skills/face-evaluation/SKILL.md) | Programming | Provides Add and manage evaluation results in Hugging Face... |
| [face-gradio](../../skills/face-gradio/SKILL.md) | Programming | Provides Build or edit Gradio apps, layouts, components,... |
| [face-jobs](../../skills/face-jobs/SKILL.md) | Programming | Provides Run workloads on Hugging Face Jobs with managed... |
| [face-model-trainer](../../skills/face-model-trainer/SKILL.md) | Programming | Provides Train or fine-tune TRL language models on Hugging... |
| [face-paper-publisher](../../skills/face-paper-publisher/SKILL.md) | Programming | Provides Publish and manage research papers on Hugging Face... |
| [face-papers](../../skills/face-papers/SKILL.md) | Programming | Provides Read and analyze Hugging Face paper pages or arXiv... |
| [face-tool-builder](../../skills/face-tool-builder/SKILL.md) | Programming | Provides Your purpose is now is to create reusable command... |
| [face-trackio](../../skills/face-trackio/SKILL.md) | Programming | Provides Track ML experiments with Trackio using Python... |
| [face-vision-trainer](../../skills/face-vision-trainer/SKILL.md) | Programming | Provides Train or fine-tune vision models on Hugging Face... |
| [factory](../../skills/factory/SKILL.md) | Programming | "Provides this skill provides a curated collection of... |
| [factory-explainer](../../skills/factory-explainer/SKILL.md) | Programming | "Provides Explain Bitcoin Lightning channel factories and... |
| [fastapi-development](../../skills/fastapi-development/SKILL.md) | Agent | "Provides Python FastAPI backend development with async... |
| [fastapi-patterns](../../skills/fastapi-patterns/SKILL.md) | Coding | "FastAPI application structure with typed error hierarchy,... |
| [favicon](../../skills/favicon/SKILL.md) | Programming | "Provides generate favicons from a source image... |
| [feedback](../../skills/feedback/SKILL.md) | Programming | "Provides Add loading, empty, error, and success feedback... |
| [financial-modeling](../../skills/financial-modeling/SKILL.md) | Programming | "Provides Build comprehensive 3-5 year financial models... |
| [fintech](../../skills/fintech/SKILL.md) | Cncf | "Provides Expert patterns for Plaid API integration... |
| [firebase](../../skills/firebase/SKILL.md) | Cncf | "Provides Firebase gives you a complete backend in minutes... |
| [fixing](../../skills/fixing/SKILL.md) | Coding | "Provides Systematically identify and fix all failing tests... |
| [flow](../../skills/flow/SKILL.md) | Programming | "Provides Design user flows and screen structure using... |
| [flow-architect](../../skills/flow-architect/SKILL.md) | Programming | "Provides Build production-ready ReactFlow applications... |
| [flow-cro](../../skills/flow-cro/SKILL.md) | Programming | "Provides You are an expert in optimizing signup and... |
| [flow-node-ts](../../skills/flow-node-ts/SKILL.md) | Programming | "Provides Create React Flow node components following... |
| [font](../../skills/font/SKILL.md) | Programming | "CRITICAL: Use for Makepad font and text rendering.... |
| [food-safety-auditor](../../skills/food-safety-auditor/SKILL.md) | Programming | "Provides Expert AI auditor for FDA Food Safety (FSMA),... |
| [forensic-incident-response](../../skills/forensic-incident-response/SKILL.md) | Programming | "Provides Investigate sudden drops in organic traffic or... |
| [foundations](../../skills/foundations/SKILL.md) | Programming | "Provides apple human interface guidelines design... |
| [framework-azure-ai-py](../../skills/framework-azure-ai-py/SKILL.md) | Programming | Provides Build persistent agents on Azure AI Foundry using... |
| [frameworks](../../skills/frameworks/SKILL.md) | Programming | "Provides Build robust, production-grade backtesting... |
| [friday-agent](../../skills/friday-agent/SKILL.md) | Agent | "Provides Build a low-latency, Iron Man-inspired tactical... |
| [frontend](../../skills/frontend/SKILL.md) | Programming | "Provides Frontend development skill for React, Next.js,... |
| [fullstack](../../skills/fullstack/SKILL.md) | Coding | "Provides Build end-to-end type-safe APIs with tRPC —... |
| [fullstack](../../skills/fullstack/SKILL.md) | Programming | "Provides Complete toolkit for senior fullstack with modern... |
| [fundamentals](../../skills/fundamentals/SKILL.md) | Programming | Provides Context is the complete state available to a... |
| [fundamentals](../../skills/fundamentals/SKILL.md) | Programming | "Provides Generative Engine Optimization for AI search... |
| [fundamentals](../../skills/fundamentals/SKILL.md) | Programming | "Provides Core principles of SEO including E-E-A-T, Core... |
| [fundamentals](../../skills/fundamentals/SKILL.md) | Programming | "Provides Three.js scene setup, cameras, renderer, Object3D... |
| [fundamentals-market-regimes](../../skills/fundamentals-market-regimes/SKILL.md) | Trading | "Market regime detection and adaptation for trading systems... |
| [fundamentals-market-structure](../../skills/fundamentals-market-structure/SKILL.md) | Trading | "Implements market structure and trading participants... |
| [fundamentals-risk-management-basics](../../skills/fundamentals-risk-management-basics/SKILL.md) | Trading | "Position sizing, stop-loss implementation, and... |
| [fundamentals-trading-edge](../../skills/fundamentals-trading-edge/SKILL.md) | Trading | "Provides Finding and maintaining competitive advantage in... |
| [fundamentals-trading-plan](../../skills/fundamentals-trading-plan/SKILL.md) | Trading | "Implements trading plan structure and risk management... |
| [fundamentals-trading-psychology](../../skills/fundamentals-trading-psychology/SKILL.md) | Trading | "Emotional discipline, cognitive bias awareness, and... |
| [fuzzing-bug-bounty](../../skills/fuzzing-bug-bounty/SKILL.md) | Coding | "Provides Provide comprehensive techniques for testing... |
| [games](../../skills/games/SKILL.md) | Programming | "Provides 2D game development principles. Sprites,... |
| [games](../../skills/games/SKILL.md) | Programming | "Provides 3D game development principles. Rendering,... |
| [games](../../skills/games/SKILL.md) | Programming | "Provides Mobile game development principles. Touch input,... |
| [games](../../skills/games/SKILL.md) | Programming | "Provides PC and console game development principles.... |
| [games](../../skills/games/SKILL.md) | Programming | "Provides Web browser game development principles.... |
| [gate](../../skills/gate/SKILL.md) | Programming | Provides Pre-ingestion verification for epistemic quality... |
| [gated-debugging](../../skills/gated-debugging/SKILL.md) | Programming | "Provides use when debugging any bug. enforces a 5-phase... |
| [gates](../../skills/gates/SKILL.md) | Programming | "Provides Agente que simula Bill Gates — cofundador da... |
| [gateway](../../skills/gateway/SKILL.md) | Coding | "Provides REST API gateway for ComfyUI servers. Workflow... |
| [gdscript-patterns](../../skills/gdscript-patterns/SKILL.md) | Programming | "Provides Master Godot 4 GDScript patterns including... |
| [generate](../../skills/generate/SKILL.md) | Programming | Provides generate images and videos using fal.ai ai models... |
| [generation](../../skills/generation/SKILL.md) | Programming | "Provides Generate real audio narratives from text content... |
| [generation-doc-generate](../../skills/generation-doc-generate/SKILL.md) | Programming | "Provides You are a documentation expert specializing in... |
| [generator-builder](../../skills/generator-builder/SKILL.md) | Programming | "Provides Expert in building shareable generator tools that... |
| [geo](../../skills/geo/SKILL.md) | Programming | "Provides Optimize content for AI Overviews, ChatGPT,... |
| [geometry](../../skills/geometry/SKILL.md) | Programming | "Provides Three.js geometry creation - built-in shapes,... |
| [gif-creator](../../skills/gif-creator/SKILL.md) | Programming | "Provides a toolkit providing utilities and knowledge for... |
| [gift](../../skills/gift/SKILL.md) | Programming | "Provides Relationship-aware daily gift engine with... |
| [git-branching-strategies](../../skills/git-branching-strategies/SKILL.md) | Coding | "Git branching models including Git Flow, GitHub Flow,... |
| [git-worktrees](../../skills/git-worktrees/SKILL.md) | Programming | "Provides Git worktrees create isolated workspaces sharing... |
| [github](../../skills/github/SKILL.md) | Programming | "Provides use the `gh` cli for issues, pull requests,... |
| [github-repo-commander](../../skills/github-repo-commander/SKILL.md) | Coding | "Provides 7-stage super workflow for GitHub repo audit,... |
| [godot-4-migration](../../skills/godot-4-migration/SKILL.md) | Programming | "Provides Specialized guide for migrating Godot 3.x... |
| [golang](../../skills/golang/SKILL.md) | Programming | "Provides Guide for building reliable, fault-tolerant Go... |
| [golang](../../skills/golang/SKILL.md) | Programming | "Provides Build production-ready gRPC services in Go with... |
| [graphql](../../skills/graphql/SKILL.md) | Coding | Provides GraphQL gives clients exactly the data they need -... |
| [gratitude](../../skills/gratitude/SKILL.md) | Programming | Provides Multi-agent research skill for parallel research... |
| [guardian](../../skills/guardian/SKILL.md) | Programming | Provides Guardiao de contexto que preserva dados criticos... |
| [guidelines](../../skills/guidelines/SKILL.md) | Programming | "Provides Write copy following Sentry brand guidelines. Use... |
| [guidelines-anthropic](../../skills/guidelines-anthropic/SKILL.md) | Programming | "Provides To access Anthropic's official brand identity and... |
| [guidelines-community](../../skills/guidelines-community/SKILL.md) | Programming | "Provides To access Anthropic's official brand identity and... |
| [handling-patterns](../../skills/handling-patterns/SKILL.md) | Programming | "Provides Build resilient applications with robust error... |
| [health-analyzer](../../skills/health-analyzer/SKILL.md) | Programming | "Provides 分析家族病史、评估遗 传风险、识别家庭健康模式、提 供个性化预防建议 functionality... |
| [health-analyzer](../../skills/health-analyzer/SKILL.md) | Programming | "Provides 分析心理健康数据、识 别心理模式、评估心理健康状况 、提供个性化心理健康建议。支... |
| [health-analyzer](../../skills/health-analyzer/SKILL.md) | Programming | "Provides 分析职业健康数据、识 别工作相关健康风险、评估职业 健康状况、提供个性化职业健康... |
| [health-analyzer](../../skills/health-analyzer/SKILL.md) | Programming | "Provides 分析口腔健康数据、识 别口腔问题模式、评估口腔健康 状况、提供个性化口腔健康建议... |
| [health-analyzer](../../skills/health-analyzer/SKILL.md) | Programming | "Provides sexual health analyzer functionality and... |
| [health-analyzer](../../skills/health-analyzer/SKILL.md) | Programming | Provides Analyze skin health data, identify skin problem... |
| [health-analyzer](../../skills/health-analyzer/SKILL.md) | Programming | "Provides 分析旅行健康数据、评 估目的地健康风险、提供疫苗接 种建议、生成多语言紧急医疗信... |
| [hinton](../../skills/hinton/SKILL.md) | Programming | "Provides Agente que simula Geoffrey Hinton — Godfather of... |
| [hono](../../skills/hono/SKILL.md) | Coding | "Provides Build ultra-fast web APIs and full-stack apps... |
| [hr-payroll-setup](../../skills/hr-payroll-setup/SKILL.md) | Programming | 'Provides Expert guide for Odoo HR and Payroll: salary... |
| [hreflang](../../skills/hreflang/SKILL.md) | Programming | "Provides Hreflang and international SEO audit, validation,... |
| [human-search-mcp](../../skills/human-search-mcp/SKILL.md) | Agent | "Provides Search AI-ready websites, inspect indexed site... |
| [hunter](../../skills/hunter/SKILL.md) | Coding | "Provides Systematically finds and fixes bugs using proven... |
| [hunter](../../skills/hunter/SKILL.md) | Programming | "Provides Automatically hunt for high-impact OSS... |
| [ia](../../skills/ia/SKILL.md) | Programming | "Provides Especialista em leiloes judiciais e... |
| [ideas](../../skills/ideas/SKILL.md) | Programming | "Provides Provide proven marketing strategies and growth... |
| [identity-dotnet](../../skills/identity-dotnet/SKILL.md) | Cncf | "Provides Azure Identity SDK for .NET. Authentication... |
| [identity-java](../../skills/identity-java/SKILL.md) | Cncf | "Provides Authenticate Java applications with Azure... |
| [identity-py](../../skills/identity-py/SKILL.md) | Cncf | "Provides Azure Identity SDK for Python authentication. Use... |
| [identity-rust](../../skills/identity-rust/SKILL.md) | Cncf | "Provides Azure Identity SDK for Rust authentication. Use... |
| [identity-ts](../../skills/identity-ts/SKILL.md) | Cncf | "Provides Authenticate to Azure services with various... |
| [image-edit](../../skills/image-edit/SKILL.md) | Programming | Provides AI-powered image editing with style transfer and... |
| [image-gen](../../skills/image-gen/SKILL.md) | Programming | "Provides Generate SEO-focused images such as OG cards,... |
| [imagen](../../skills/imagen/SKILL.md) | Programming | "Provides AI image generation skill powered by Google... |
| [images](../../skills/images/SKILL.md) | Programming | "Provides Image optimization analysis for SEO and... |
| [implementation](../../skills/implementation/SKILL.md) | Agent | Provides RAG (Retrieval-Augmented Generation)... |
| [implementation](../../skills/implementation/SKILL.md) | Cncf | Provides Framework for defining and implementing Service... |
| [implementation](../../skills/implementation/SKILL.md) | Coding | "Provides Implement Command Query Responsibility... |
| [impress](../../skills/impress/SKILL.md) | Programming | "Provides Presentation creation, format conversion... |
| [improver](../../skills/improver/SKILL.md) | Agent | "Provides Iteratively improve a Claude Code skill using the... |
| [in-chrome-troubleshooting](../../skills/in-chrome-troubleshooting/SKILL.md) | Programming | Provides Diagnose and fix Claude in Chrome MCP extension... |
| [index-tuning](../../skills/index-tuning/SKILL.md) | Programming | Provides Optimize vector index performance for latency,... |
| [influencer-discovery](../../skills/influencer-discovery/SKILL.md) | Agent | Provides Find and evaluate influencers for brand... |
| [infrastructure](../../skills/infrastructure/SKILL.md) | Agent | Provides Terraform infrastructure as code workflow for... |
| [inputs](../../skills/inputs/SKILL.md) | Programming | "Provides Check for .claude/apple-design-context.md before... |
| [instagram](../../skills/instagram/SKILL.md) | Programming | "Provides Integracao completa com Instagram via Graph API.... |
| [installer](../../skills/installer/SKILL.md) | Agent | "Provides Instala, valida, registra e verifica novas skills... |
| [integration](../../skills/integration/SKILL.md) | Cncf | "Provides Expert patterns for HubSpot CRM integration... |
| [integration](../../skills/integration/SKILL.md) | Cncf | "Provides Integrate Stripe, PayPal, and payment processors.... |
| [integration](../../skills/integration/SKILL.md) | Cncf | "Provides Master PayPal payment integration including... |
| [integration](../../skills/integration/SKILL.md) | Cncf | "Provides Master Stripe payment processing integration for... |
| [integration](../../skills/integration/SKILL.md) | Cncf | "Provides Integration skill for searching and fetching... |
| [interaction](../../skills/interaction/SKILL.md) | Programming | "Provides Three.js interaction - raycasting, controls,... |
| [inventor](../../skills/inventor/SKILL.md) | Programming | "Provides Product Inventor e Design Alchemist de nivel... |
| [inventory-optimizer](../../skills/inventory-optimizer/SKILL.md) | Programming | 'Provides Expert guide for Odoo Inventory: stock valuation... |
| [issue-auditor](../../skills/issue-auditor/SKILL.md) | Programming | "Provides High-level technical SEO and site architecture... |
| [issue-creator](../../skills/issue-creator/SKILL.md) | Programming | "Provides Turn error logs, screenshots, voice notes, and... |
| [javascript-patterns](../../skills/javascript-patterns/SKILL.md) | Programming | "Provides Comprehensive guide for mastering modern... |
| [jetpack-compose-expert](../../skills/jetpack-compose-expert/SKILL.md) | Programming | "Provides Expert guidance for building modern Android UIs... |
| [jobgpt](../../skills/jobgpt/SKILL.md) | Programming | "Provides Job search automation, auto apply, resume... |
| [jobs](../../skills/jobs/SKILL.md) | Programming | "Provides Agente que simula Steve Jobs — cofundador da... |
| [jq](../../skills/jq/SKILL.md) | Programming | "Provides Expert jq usage for JSON querying, filtering,... |
| [js](../../skills/js/SKILL.md) | Programming | "Provides Run Hugging Face models in JavaScript or... |
| [juice-shop](../../skills/juice-shop/SKILL.md) | Coding | "'OWASP Juice Shop guide: Web application security testing... |
| [juridico](../../skills/juridico/SKILL.md) | Programming | 'Provides Analise juridica de leiloes: nulidades, bem de... |
| [karpathy](../../skills/karpathy/SKILL.md) | Programming | "Provides Agente que simula Andrej Karpathy — ex-Director... |
| [keyvault-certificates-rust](../../skills/keyvault-certificates-rust/SKILL.md) | Cncf | "Provides Azure Key Vault Certificates SDK for Rust. Use... |
| [keyvault-keys-rust](../../skills/keyvault-keys-rust/SKILL.md) | Cncf | "Provides Azure Key Vault Keys SDK for Rust. Use for... |
| [keyvault-keys-ts](../../skills/keyvault-keys-ts/SKILL.md) | Cncf | "Provides Manage cryptographic keys using Azure Key Vault... |
| [keyvault-py](../../skills/keyvault-py/SKILL.md) | Cncf | "Provides Azure Key Vault SDK for Python. Use for secrets,... |
| [keyvault-secrets-rust](../../skills/keyvault-secrets-rust/SKILL.md) | Cncf | "Provides Azure Key Vault Secrets SDK for Rust. Use for... |
| [keyvault-secrets-ts](../../skills/keyvault-secrets-ts/SKILL.md) | Cncf | "Provides Manage secrets using Azure Key Vault Secrets SDK... |
| [keyword-strategist](../../skills/keyword-strategist/SKILL.md) | Programming | "Analyzes keyword usage in provided content, calculates... |
| [knowledge-extraction](../../skills/knowledge-extraction/SKILL.md) | Programming | Provides Extract structured domain knowledge from AI models... |
| [l10n-compliance](../../skills/l10n-compliance/SKILL.md) | Programming | 'Provides Country-specific Odoo localization: tax... |
| [lab](../../skills/lab/SKILL.md) | Programming | "Provides lab environment for claude superpowers... |
| [landscape](../../skills/landscape/SKILL.md) | Programming | "Provides Comprehensive frameworks for analyzing... |
| [lang](../../skills/lang/SKILL.md) | Agent | Provides Native agent-to-agent language for compact... |
| [langfuse](../../skills/langfuse/SKILL.md) | Programming | Provides Expert in Langfuse - the open-source LLM... |
| [langgraph](../../skills/langgraph/SKILL.md) | Agent | Provides Expert in LangGraph - the production-grade... |
| [last30days](../../skills/last30days/SKILL.md) | Programming | "Provides Research a topic from the last 30 days on Reddit... |
| [layout](../../skills/layout/SKILL.md) | Programming | "CRITICAL: Use for Makepad layout system. Triggers on"... |
| [layout-zafiro](../../skills/layout-zafiro/SKILL.md) | Programming | "Provides Guidelines for modern Avalonia UI layout using... |
| [lead-generation](../../skills/lead-generation/SKILL.md) | Agent | Implements scrape leads from multiple platforms using apify... |
| [learn](../../skills/learn/SKILL.md) | Programming | Provides Machine learning in Python with scikit-learn. Use... |
| [learning-ops-ml-pipeline](../../skills/learning-ops-ml-pipeline/SKILL.md) | Programming | 'Provides design and implement a complete ml pipeline for:... |
| [lecun](../../skills/lecun/SKILL.md) | Programming | "Provides Agente que simula Yann LeCun — inventor das... |
| [lecun-debate](../../skills/lecun-debate/SKILL.md) | Programming | "Provides Sub-skill de debates e posições de Yann LeCun.... |
| [lecun-filosofia](../../skills/lecun-filosofia/SKILL.md) | Programming | "Provides sub-skill filosófica e pedagógica de yann lecun... |
| [lecun-tecnico](../../skills/lecun-tecnico/SKILL.md) | Programming | "Provides Sub-skill técnica de Yann LeCun. Cobre CNNs,... |
| [legal-seo-audit](../../skills/legal-seo-audit/SKILL.md) | Programming | "Provides Audit and improve local SEO for law firms,... |
| [leiloeiros](../../skills/leiloeiros/SKILL.md) | Coding | "Provides Coleta e consulta dados de leiloeiros oficiais de... |
| [lex](../../skills/lex/SKILL.md) | Programming | "Provides Centralized 'Truth Engine' for... |
| [library](../../skills/library/SKILL.md) | Programming | "Provides Extensive icon library and AI-driven icon... |
| [library](../../skills/library/SKILL.md) | Programming | "Provides a comprehensive collection of battle-tested... |
| [lighting](../../skills/lighting/SKILL.md) | Programming | "Provides Three.js lighting - light types, shadows,... |
| [like-socrates](../../skills/like-socrates/SKILL.md) | Programming | "Explains concepts using Socratic-style dialogue. Use when... |
| [line-psychologist](../../skills/line-psychologist/SKILL.md) | Programming | "Provides one sentence - what this skill does and when to... |
| [linux](../../skills/linux/SKILL.md) | Programming | "Provides Bash/Linux terminal patterns. Critical commands,... |
| [liquid-glass](../../skills/liquid-glass/SKILL.md) | Programming | "Provides Implement or review SwiftUI Liquid Glass APIs... |
| [llm-expert](../../skills/llm-expert/SKILL.md) | Programming | Provides Master local LLM inference, model selection, VRAM... |
| [loaders](../../skills/loaders/SKILL.md) | Programming | "Provides Three.js asset loading - GLTF, textures, images,... |
| [localization](../../skills/localization/SKILL.md) | Programming | "Provides Internationalization and localization patterns.... |
| [loop](../../skills/loop/SKILL.md) | Programming | "Teaches agents to iteratively build websites using Stitch... |
| [macro-analyzer](../../skills/macro-analyzer/SKILL.md) | Programming | "Provides Professional PESTEL/SWOT analysis agent based on... |
| [magnets](../../skills/magnets/SKILL.md) | Programming | "Provides Plan and optimize lead magnets for email capture... |
| [make-patterns](../../skills/make-patterns/SKILL.md) | Agent | Provides No-code automation democratizes workflow building.... |
| [makepad-animation](../../skills/makepad-animation/SKILL.md) | Programming | Implements Makepad animation system patterns with... |
| [management](../../skills/management/SKILL.md) | Cncf | Provides Server management principles and decision-making.... |
| [management](../../skills/management/SKILL.md) | Programming | "Provides Manage citations systematically throughout the... |
| [management](../../skills/management/SKILL.md) | Programming | "Provides Build efficient, scalable monorepos that enable... |
| [management-context-restore](../../skills/management-context-restore/SKILL.md) | Programming | Provides use when working with context management context... |
| [management-context-save](../../skills/management-context-save/SKILL.md) | Programming | Provides use when working with context management context... |
| [manager](../../skills/manager/SKILL.md) | Programming | Provides Elite AI context engineering specialist mastering... |
| [manager](../../skills/manager/SKILL.md) | Programming | "Provides Senior PM agent with 6 knowledge domains, 30+... |
| [manager](../../skills/manager/SKILL.md) | Programming | "Provides Monitor portfolio risk, R-multiples, and position... |
| [manager-hospital](../../skills/manager-hospital/SKILL.md) | Programming | "Provides World-class Hospital IT Management Advisor... |
| [manager-pro](../../skills/manager-pro/SKILL.md) | Programming | Provides Elite IT Management Advisor specializing in... |
| [manager-skill](../../skills/manager-skill/SKILL.md) | Agent | Provides Manage multiple local CLI agents via tmux sessions... |
| [manager-toolkit](../../skills/manager-toolkit/SKILL.md) | Programming | "Provides Essential tools and frameworks for modern product... |
| [manifest](../../skills/manifest/SKILL.md) | Programming | "Provides Install and configure the Manifest observability... |
| [manifest-generator](../../skills/manifest-generator/SKILL.md) | Cncf | Provides Step-by-step guidance for creating... |
| [manufacturing-advisor](../../skills/manufacturing-advisor/SKILL.md) | Programming | 'Provides Expert guide for Odoo Manufacturing: Bills of... |
| [maps-search-dotnet](../../skills/maps-search-dotnet/SKILL.md) | Cncf | "Provides Azure Maps SDK for .NET. Location-based services... |
| [markdown](../../skills/markdown/SKILL.md) | Programming | "Provides Create and edit Obsidian Flavored Markdown with... |
| [markdown-best-practices](../../skills/markdown-best-practices/SKILL.md) | Coding | "Provides Markdown best practices for OpenCode skills -... |
| [market-research](../../skills/market-research/SKILL.md) | Agent | Provides Analyze market conditions, geographic... |
| [marketer](../../skills/marketer/SKILL.md) | Programming | Provides Elite content marketing strategist specializing in... |
| [marketing-context](../../skills/marketing-context/SKILL.md) | Programming | "Provides Create or update a reusable product marketing... |
| [markup](../../skills/markup/SKILL.md) | Programming | Provides Design, validate, and optimize schema.org... |
| [mastery](../../skills/mastery/SKILL.md) | Programming | "Provides 33+ essential JavaScript concepts every developer... |
| [materials](../../skills/materials/SKILL.md) | Programming | "Provides Three.js materials - PBR, basic, phong, shader... |
| [matplotlib](../../skills/matplotlib/SKILL.md) | Programming | "Provides Matplotlib is Python's foundational visualization... |
| [matrix-integration](../../skills/matrix-integration/SKILL.md) | Programming | "CRITICAL: Use for Matrix SDK integration with Makepad.... |
| [maxia](../../skills/maxia/SKILL.md) | Programming | "Provides Connect to MAXIA AI-to-AI marketplace on Solana.... |
| [mcp](../../skills/mcp/SKILL.md) | Programming | Provides Connect to Helium's MCP server for news research,... |
| [mcp-governance](../../skills/mcp-governance/SKILL.md) | Programming | "Provides Agent governance skill for MCP tool calls — Cedar... |
| [mcp-tools-expert](../../skills/mcp-tools-expert/SKILL.md) | Agent | Provides Expert guide for using n8n-mcp MCP tools... |
| [md](../../skills/md/SKILL.md) | Programming | Provides this skill should be used when the user asks to... |
| [md](../../skills/md/SKILL.md) | Programming | Provides Convert human-written CLAUDE.md into AI-native... |
| [md](../../skills/md/SKILL.md) | Programming | "Provides Analyze Stitch projects and synthesize a semantic... |
| [md](../../skills/md/SKILL.md) | Programming | 'Provides 6-layer AI governance: safety gates,... |
| [medtech-compliance-auditor](../../skills/medtech-compliance-auditor/SKILL.md) | Programming | "Provides Expert AI auditor for Medical Device (SaMD)... |
| [memory](../../skills/memory/SKILL.md) | Agent | "Provides Persistent memory systems for LLM conversations... |
| [memory-mcp](../../skills/memory-mcp/SKILL.md) | Programming | Provides a hybrid memory system that provides persistent,... |
| [memory-systems](../../skills/memory-systems/SKILL.md) | Agent | 'Provides Memory is the cornerstone of intelligent agents.... |
| [mental-states](../../skills/mental-states/SKILL.md) | Programming | Provides this skill should be used when the user asks to... |
| [menubar-tuist-app](../../skills/menubar-tuist-app/SKILL.md) | Programming | "Provides Build, refactor, or review SwiftUI macOS menubar... |
| [mercado](../../skills/mercado/SKILL.md) | Programming | "Provides Analise de mercado imobiliario para leiloes.... |
| [mesh-expert](../../skills/mesh-expert/SKILL.md) | Cncf | Provides Expert service mesh architect specializing in... |
| [mesh-observability](../../skills/mesh-observability/SKILL.md) | Cncf | Provides Complete guide to observability patterns for... |
| [messaging-webpubsub-java](../../skills/messaging-webpubsub-java/SKILL.md) | Cncf | "Provides Build real-time web applications with Azure Web... |
| [messaging-webpubsubservice-py](../../skills/messaging-webpubsubservice-py/SKILL.md) | Cncf | "Provides Azure Web PubSub Service SDK for Python. Use for... |
| [meta-optimizer](../../skills/meta-optimizer/SKILL.md) | Programming | "Creates optimized meta titles, descriptions, and URL... |
| [metadata](../../skills/metadata/SKILL.md) | Coding | Provides Audit and fix HTML metadata including page titles,... |
| [metrics-calculation](../../skills/metrics-calculation/SKILL.md) | Programming | "Provides Calculate portfolio risk metrics including VaR,... |
| [metrics-framework](../../skills/metrics-framework/SKILL.md) | Programming | "Provides Comprehensive guide to tracking, calculating, and... |
| [mgmt-apicenter-dotnet](../../skills/mgmt-apicenter-dotnet/SKILL.md) | Cncf | "Provides Azure API Center SDK for .NET. Centralized API... |
| [mgmt-apicenter-py](../../skills/mgmt-apicenter-py/SKILL.md) | Cncf | Provides Azure API Center Management SDK for Python. Use... |
| [mgmt-apimanagement-dotnet](../../skills/mgmt-apimanagement-dotnet/SKILL.md) | Cncf | "Configures azure resource manager sdk for api management... |
| [mgmt-apimanagement-py](../../skills/mgmt-apimanagement-py/SKILL.md) | Cncf | "Provides Azure API Management SDK for Python. Use for... |
| [mgmt-applicationinsights-dotnet](../../skills/mgmt-applicationinsights-dotnet/SKILL.md) | Cncf | "Provides Azure Application Insights SDK for .NET.... |
| [mgmt-arizeaiobservabilityeval-dotnet](../../skills/mgmt-arizeaiobservabilityeval-dotnet/SKILL.md) | Cncf | "Provides Azure Resource Manager SDK for Arize AI... |
| [mgmt-botservice-dotnet](../../skills/mgmt-botservice-dotnet/SKILL.md) | Cncf | "Provides Azure Resource Manager SDK for Bot Service in... |
| [mgmt-botservice-py](../../skills/mgmt-botservice-py/SKILL.md) | Cncf | "Provides Azure Bot Service Management SDK for Python. Use... |
| [mgmt-fabric-dotnet](../../skills/mgmt-fabric-dotnet/SKILL.md) | Cncf | "Configures azure resource manager sdk for fabric in .net... |
| [mgmt-fabric-py](../../skills/mgmt-fabric-py/SKILL.md) | Cncf | "Provides Azure Fabric Management SDK for Python. Use for... |
| [mgmt-mongodbatlas-dotnet](../../skills/mgmt-mongodbatlas-dotnet/SKILL.md) | Cncf | "Provides Manage MongoDB Atlas Organizations as Azure ARM... |
| [mgmt-weightsandbiases-dotnet](../../skills/mgmt-weightsandbiases-dotnet/SKILL.md) | Cncf | "Provides Azure Weights & Biases SDK for .NET. ML... |
| [microsoft-playwright-testing-ts](../../skills/microsoft-playwright-testing-ts/SKILL.md) | Cncf | Provides Run Playwright tests at scale with cloud-hosted... |
| [migration](../../skills/migration/SKILL.md) | Cncf | "Provides Master database schema and data migrations across... |
| [migration](../../skills/migration/SKILL.md) | Programming | "Provides Master AngularJS to Angular migration, including... |
| [migration-code-migrate](../../skills/migration-code-migrate/SKILL.md) | Programming | "Provides You are a code migration expert specializing in... |
| [migration-deps-upgrade](../../skills/migration-deps-upgrade/SKILL.md) | Programming | "Provides You are a dependency management expert... |
| [migration-helper](../../skills/migration-helper/SKILL.md) | Programming | "Provides Step-by-step guide for migrating Odoo custom... |
| [migration-legacy-modernize](../../skills/migration-legacy-modernize/SKILL.md) | Programming | "Provides Orchestrate a comprehensive legacy system... |
| [migrations-migration-observability](../../skills/migrations-migration-observability/SKILL.md) | Cncf | Configures migration monitoring, cdc, and observability... |
| [migrations-sql-migrations](../../skills/migrations-sql-migrations/SKILL.md) | Cncf | Provides SQL database migrations with zero-downtime... |
| [mini-app](../../skills/mini-app/SKILL.md) | Programming | "Provides Expert in building Telegram Mini Apps (TWA) - web... |
| [mirror](../../skills/mirror/SKILL.md) | Programming | "Provides one sentence - what this skill does and when to... |
| [ml](../../skills/ml/SKILL.md) | Agent | "Provides AI and machine learning workflow covering LLM... |
| [mobile-development-component-scaffold](../../skills/mobile-development-component-scaffold/SKILL.md) | Coding | "Provides You are a React component architecture expert... |
| [mobile-security-xss-scan](../../skills/mobile-security-xss-scan/SKILL.md) | Programming | Provides You are a frontend security specialist focusing on... |
| [mode](../../skills/mode/SKILL.md) | Programming | 'Provides Version 2.35.0 | PRD to Production | Zero Human... |
| [models-py](../../skills/models-py/SKILL.md) | Programming | "Provides Create Pydantic models following the multi-model... |
| [modernization](../../skills/modernization/SKILL.md) | Programming | "Provides Master React version upgrades, class to hooks... |
| [modernizer](../../skills/modernizer/SKILL.md) | Programming | "Provides Refactor legacy codebases, migrate outdated... |
| [modes](../../skills/modes/SKILL.md) | Agent | "Provides AI operational modes (brainstorm, implement,... |
| [module-developer](../../skills/module-developer/SKILL.md) | Programming | "Provides Expert guide for creating custom Odoo modules.... |
| [module-library](../../skills/module-library/SKILL.md) | Cncf | Provides Production-ready Terraform module patterns for... |
| [molykit](../../skills/molykit/SKILL.md) | Programming | "CRITICAL: Use for MolyKit AI chat toolkit. Triggers on"... |
| [monetization](../../skills/monetization/SKILL.md) | Programming | "Provides Estrategia e implementacao de monetizacao para... |
| [monitor](../../skills/monitor/SKILL.md) | Programming | Provides Monitor de performance do Claude Code e sistema... |
| [monitor-ingestion-java](../../skills/monitor-ingestion-java/SKILL.md) | Cncf | Provides Azure Monitor Ingestion SDK for Java. Send custom... |
| [monitor-ingestion-py](../../skills/monitor-ingestion-py/SKILL.md) | Cncf | "Provides Azure Monitor Ingestion SDK for Python. Use for... |
| [monitor-opentelemetry-exporter-java](../../skills/monitor-opentelemetry-exporter-java/SKILL.md) | Cncf | "Provides Azure Monitor OpenTelemetry Exporter for Java.... |
| [monitor-opentelemetry-exporter-py](../../skills/monitor-opentelemetry-exporter-py/SKILL.md) | Cncf | "Provides Azure Monitor OpenTelemetry Exporter for Python.... |
| [monitor-opentelemetry-py](../../skills/monitor-opentelemetry-py/SKILL.md) | Cncf | "Provides Azure Monitor OpenTelemetry Distro for Python.... |
| [monitor-opentelemetry-ts](../../skills/monitor-opentelemetry-ts/SKILL.md) | Cncf | "Provides Auto-instrument Node.js applications with... |
| [monitor-query-java](../../skills/monitor-query-java/SKILL.md) | Cncf | "Provides Azure Monitor Query SDK for Java. Execute Kusto... |
| [monitor-query-py](../../skills/monitor-query-py/SKILL.md) | Cncf | "Provides Azure Monitor Query SDK for Python. Use for... |
| [monitoring-monitor-setup](../../skills/monitoring-monitor-setup/SKILL.md) | Cncf | "Provides You are a monitoring and observability expert... |
| [monitoring-slo-implement](../../skills/monitoring-slo-implement/SKILL.md) | Cncf | "Provides You are an SLO (Service Level Objective) expert... |
| [motion-performance](../../skills/motion-performance/SKILL.md) | Coding | Provides Audit and fix animation performance issues... |
| [moyu](../../skills/moyu/SKILL.md) | Programming | "Anti-over-engineering guardrail that activates when an AI... |
| [multi-tenant](../../skills/multi-tenant/SKILL.md) | Cncf | "Provides Design and implement multi-tenant SaaS... |
| [multiplayer](../../skills/multiplayer/SKILL.md) | Programming | "Provides Multiplayer game development principles.... |
| [musk](../../skills/musk/SKILL.md) | Programming | "Provides Agente que simula Elon Musk com profundidade... |
| [mvp-launcher](../../skills/mvp-launcher/SKILL.md) | Programming | "Provides use when planning or building a saas mvp from... |
| [native-architecture](../../skills/native-architecture/SKILL.md) | Programming | "Provides Production-ready patterns for React Native... |
| [native-cli](../../skills/native-cli/SKILL.md) | Programming | Provides Design spec with 98 rules for building CLI tools... |
| [native-ui](../../skills/native-ui/SKILL.md) | Programming | "Provides Complete guide for building beautiful apps with... |
| [neon](../../skills/neon/SKILL.md) | Cncf | Provides Neon is a serverless Postgres platform that... |
| [networkx](../../skills/networkx/SKILL.md) | Programming | "Provides NetworkX is a Python package for creating,... |
| [news-report](../../skills/news-report/SKILL.md) | Programming | "Provides Scrapes content based on a preset URL list,... |
| [nextjs-development](../../skills/nextjs-development/SKILL.md) | Agent | "Provides React and Next.js 14+ application development... |
| [node-configuration](../../skills/node-configuration/SKILL.md) | Agent | Provides Operation-aware node configuration guidance. Use... |
| [nonconformance](../../skills/nonconformance/SKILL.md) | Programming | "Provides Codified expertise for quality control,... |
| [notebooklm](../../skills/notebooklm/SKILL.md) | Programming | Provides Interact with Google NotebookLM to query... |
| [official](../../skills/official/SKILL.md) | Programming | "Provides a user may ask you to create, edit, or analyze... |
| [official](../../skills/official/SKILL.md) | Programming | "Provides this guide covers essential pdf processing... |
| [official](../../skills/official/SKILL.md) | Programming | "Provides a user may ask you to create, edit, or analyze... |
| [official](../../skills/official/SKILL.md) | Programming | "Provides unless otherwise stated by the user or existing... |
| [on-windows](../../skills/on-windows/SKILL.md) | Programming | "Provides How to use a Win32 build of BusyBox to run many... |
| [onboarding](../../skills/onboarding/SKILL.md) | Programming | "Provides Generate two complementary onboarding documents... |
| [ops](../../skills/ops/SKILL.md) | Programming | Provides LLM Operations -- RAG, embeddings, vector... |
| [optimization](../../skills/optimization/SKILL.md) | Agent | Provides PostgreSQL database optimization workflow for... |
| [optimization](../../skills/optimization/SKILL.md) | Cncf | "Provides Strategies and patterns for optimizing cloud... |
| [optimization](../../skills/optimization/SKILL.md) | Programming | Provides Context optimization extends the effective... |
| [optimization](../../skills/optimization/SKILL.md) | Programming | Provides Optimize Apache Spark jobs with partitioning,... |
| [optimization-patterns](../../skills/optimization-patterns/SKILL.md) | Cncf | Provides Transform slow database queries into... |
| [optimizer](../../skills/optimizer/SKILL.md) | Agent | Provides Diagnose and optimize Agent Skills (SKILL.md) with... |
| [optimizer](../../skills/optimizer/SKILL.md) | Agent | 'Provides Adaptive token optimizer: intelligent filtering,... |
| [optimizer](../../skills/optimizer/SKILL.md) | Cncf | Provides Expert database optimizer specializing in modern... |
| [optimizer](../../skills/optimizer/SKILL.md) | Programming | "Provides Developer Experience specialist. Improves... |
| [optimizer](../../skills/optimizer/SKILL.md) | Programming | Provides Identifies and fixes performance bottlenecks in... |
| [option-ref](../../skills/option-ref/SKILL.md) | Programming | Provides Quick reference for Option type. Use when user... |
| [orchestration](../../skills/orchestration/SKILL.md) | Coding | "Provides Patterns for managing distributed transactions... |
| [orchestration](../../skills/orchestration/SKILL.md) | Programming | "Orchestrates design workflows by routing work through... |
| [orchestration-improve-agent](../../skills/orchestration-improve-agent/SKILL.md) | Programming | Provides Systematic improvement of existing agents through... |
| [orchestration-multi-agent-optimize](../../skills/orchestration-multi-agent-optimize/SKILL.md) | Programming | Provides Optimize multi-agent systems with coordinated... |
| [orchestrator](../../skills/orchestrator/SKILL.md) | Programming | Provides Meta-skill que orquestra todos os agentes do... |
| [orchestrator](../../skills/orchestrator/SKILL.md) | Programming | "Provides Orquestrador unificado de canais sociais —... |
| [organizer](../../skills/organizer/SKILL.md) | Programming | 'Provides 6. Reduces Clutter: Identifies old files you... |
| [orm-expert](../../skills/orm-expert/SKILL.md) | Cncf | "Provides Expert in Drizzle ORM for TypeScript — schema... |
| [orm-expert](../../skills/orm-expert/SKILL.md) | Programming | 'Provides Master Odoo ORM patterns: search, browse, create,... |
| [os](../../skills/os/SKILL.md) | Programming | "Provides Five-phase pipeline (triage → clarify → research ... |
| [output-enforcement](../../skills/output-enforcement/SKILL.md) | Coding | "Provides use when a task requires exhaustive unabridged... |
| [package-manager](../../skills/package-manager/SKILL.md) | Programming | "Provides Comprehensive guide to using uv, an extremely... |
| [packaging](../../skills/packaging/SKILL.md) | Programming | "Provides Comprehensive guide to creating, structuring, and... |
| [page](../../skills/page/SKILL.md) | Programming | "Provides Deep single-page SEO analysis covering on-page... |
| [page](../../skills/page/SKILL.md) | Programming | "Provides Scaffold a new mobile-first page using StyleSeed... |
| [page-generator](../../skills/page-generator/SKILL.md) | Coding | "Generates high-converting Next.js/React landing pages with... |
| [page-writer](../../skills/page-writer/SKILL.md) | Programming | "Provides You are a senior documentation engineer that... |
| [paper-commission-model](../../skills/paper-commission-model/SKILL.md) | Trading | "Implements commission model and fee structure simulation... |
| [paper-conversion](../../skills/paper-conversion/SKILL.md) | Programming | "Provides this skill should be used when the user asks to... |
| [paper-fill-simulation](../../skills/paper-fill-simulation/SKILL.md) | Trading | "Implements fill simulation models for order execution... |
| [paper-market-impact](../../skills/paper-market-impact/SKILL.md) | Trading | "Implements market impact modeling and order book... |
| [paper-performance-attribution](../../skills/paper-performance-attribution/SKILL.md) | Trading | "Provides Performance Attribution Systems for Trading... |
| [paper-realistic-simulation](../../skills/paper-realistic-simulation/SKILL.md) | Trading | "Provides Realistic Paper Trading Simulation with Market... |
| [paper-slippage-model](../../skills/paper-slippage-model/SKILL.md) | Trading | "Implements slippage modeling and execution simulation for... |
| [parallel-agents](../../skills/parallel-agents/SKILL.md) | Agent | Provides use when facing 2+ independent tasks that can be... |
| [pattern](../../skills/pattern/SKILL.md) | Programming | "Provides Generate reusable UI patterns such as card... |
| [patterns](../../skills/patterns/SKILL.md) | Cncf | "Provides Common AWS CDK patterns and constructs for... |
| [patterns](../../skills/patterns/SKILL.md) | Coding | "Provides API design principles and decision-making. REST... |
| [patterns](../../skills/patterns/SKILL.md) | Coding | Provides Master proven backend architecture patterns... |
| [patterns](../../skills/patterns/SKILL.md) | Coding | Provides Master microservices architecture patterns... |
| [patterns](../../skills/patterns/SKILL.md) | Coding | "Provides Build read models and projections from event... |
| [patterns](../../skills/patterns/SKILL.md) | Coding | "Provides Modern React patterns and principles. Hooks,... |
| [patterns](../../skills/patterns/SKILL.md) | Coding | "Provides Tailwind CSS v4 principles. CSS-first... |
| [patterns](../../skills/patterns/SKILL.md) | Programming | "Provides Apple Human Interface Guidelines interaction and... |
| [patterns](../../skills/patterns/SKILL.md) | Programming | Provides Production patterns for Linkerd service mesh - the... |
| [patterns](../../skills/patterns/SKILL.md) | Programming | "Provides Python development principles and... |
| [payments-stack](../../skills/payments-stack/SKILL.md) | Cncf | "Provides Design and implement production-grade Pakistani... |
| [penetration-testing](../../skills/penetration-testing/SKILL.md) | Cncf | Provides Provide comprehensive techniques for penetration... |
| [penetration-testing](../../skills/penetration-testing/SKILL.md) | Cncf | Provides Conduct comprehensive security assessments of... |
| [perception-psychologist](../../skills/perception-psychologist/SKILL.md) | Programming | "Provides one sentence - what this skill does and when to... |
| [perf-review](../../skills/perf-review/SKILL.md) | Coding | "Implements django performance code review. use when asked... |
| [performance-audit](../../skills/performance-audit/SKILL.md) | Programming | Provides Audit SwiftUI performance issues from code review... |
| [performance-optimization](../../skills/performance-optimization/SKILL.md) | Coding | Provides Optimize website and web application performance... |
| [performance-optimization](../../skills/performance-optimization/SKILL.md) | Programming | Provides Profile and optimize Python code using cProfile,... |
| [performance-performance-optimization](../../skills/performance-performance-optimization/SKILL.md) | Cncf | Provides Optimize end-to-end application performance with... |
| [performance-tuner](../../skills/performance-tuner/SKILL.md) | Programming | 'Provides Expert guide for diagnosing and fixing Odoo... |
| [persuasion-engineer](../../skills/persuasion-engineer/SKILL.md) | Programming | "Provides one sentence - what this skill does and when to... |
| [pipe-ref](../../skills/pipe-ref/SKILL.md) | Programming | Provides Quick reference for pipe and flow. Use when user... |
| [pipeline-design](../../skills/pipeline-design/SKILL.md) | Cncf | Provides Architecture patterns for multi-stage CI/CD... |
| [plan](../../skills/plan/SKILL.md) | Programming | "Provides Strategic SEO planning for new or existing... |
| [platform](../../skills/platform/SKILL.md) | Programming | Provides Platform APIs for model management, pricing, and... |
| [platform](../../skills/platform/SKILL.md) | Programming | "CRITICAL: Use for Makepad cross-platform support. Triggers... |
| [platform-apps-multi-platform](../../skills/platform-apps-multi-platform/SKILL.md) | Programming | "Provides Build and deploy the same feature consistently... |
| [platforms](../../skills/platforms/SKILL.md) | Programming | "Provides Apple Human Interface Guidelines for... |
| [plotly](../../skills/plotly/SKILL.md) | Programming | Provides Interactive visualization library. Use when you... |
| [plugin-development](../../skills/plugin-development/SKILL.md) | Agent | "Provides WordPress plugin development workflow covering... |
| [polars](../../skills/polars/SKILL.md) | Programming | Provides Fast in-memory DataFrame library for datasets that... |
| [portfolio](../../skills/portfolio/SKILL.md) | Coding | "Provides Expert in building portfolios that actually land... |
| [post-writer-seo](../../skills/post-writer-seo/SKILL.md) | Programming | "Provides Social Media Strategist and Content Writer.... |
| [postgres](../../skills/postgres/SKILL.md) | Cncf | Provides Provision instant temporary Postgres databases via... |
| [postgres](../../skills/postgres/SKILL.md) | Cncf | Provides Expert patterns for Neon serverless Postgres,... |
| [postgres-ts](../../skills/postgres-ts/SKILL.md) | Cncf | Provides Connect to Azure Database for PostgreSQL Flexible... |
| [postgresql](../../skills/postgresql/SKILL.md) | Cncf | Provides Design a PostgreSQL-specific schema. Covers... |
| [postprocessing](../../skills/postprocessing/SKILL.md) | Programming | "Provides Three.js post-processing - EffectComposer, bloom,... |
| [ppt-skills](../../skills/ppt-skills/SKILL.md) | Programming | "Provides AI-powered PPT generation with document analysis... |
| [pptx-generator](../../skills/pptx-generator/SKILL.md) | Programming | "Provides Generate complete Python scripts that build... |
| [pragmatic](../../skills/pragmatic/SKILL.md) | Programming | "Provides a practical, jargon-free guide to functional... |
| [preemptor](../../skills/preemptor/SKILL.md) | Programming | "Provides one sentence - what this skill does and when to... |
| [prevention](../../skills/prevention/SKILL.md) | Programming | "Provides Reduce voluntary and involuntary churn with... |
| [principles](../../skills/principles/SKILL.md) | Programming | "Provides Evaluate interfaces against 168 research-backed... |
| [pro](../../skills/pro/SKILL.md) | Coding | "Provides Write efficient C code with proper memory... |
| [pro](../../skills/pro/SKILL.md) | Coding | "Provides Write idiomatic C++ code with modern features,... |
| [pro](../../skills/pro/SKILL.md) | Coding | "Provides Write modern C# code with advanced features like... |
| [pro](../../skills/pro/SKILL.md) | Coding | "Provides Master Django 5.x with async views, DRF, Celery,... |
| [pro](../../skills/pro/SKILL.md) | Coding | "Provides Write idiomatic Elixir code with OTP patterns,... |
| [pro](../../skills/pro/SKILL.md) | Coding | "Provides Build high-performance async APIs with FastAPI,... |
| [pro](../../skills/pro/SKILL.md) | Coding | "Provides Master Go 1.21+ with modern patterns, advanced... |
| [pro](../../skills/pro/SKILL.md) | Coding | "Provides Expert Haskell engineer specializing in advanced... |
| [pro](../../skills/pro/SKILL.md) | Coding | "Provides Master Java 21+ with modern features like virtual... |
| [pro](../../skills/pro/SKILL.md) | Coding | "Provides Master modern JavaScript with ES6+, async... |
| [pro](../../skills/pro/SKILL.md) | Coding | "Provides Master Julia 1.10+ with modern features,... |
| [pro](../../skills/pro/SKILL.md) | Coding | "Write idiomatic PHP code with generators, iterators, SPL... |
| [pro](../../skills/pro/SKILL.md) | Coding | "Provides Master Python 3.12+ with modern features, async... |
| [pro](../../skills/pro/SKILL.md) | Coding | "Provides Write idiomatic Ruby code with metaprogramming,... |
| [pro](../../skills/pro/SKILL.md) | Coding | "Provides Master Rust 1.75+ with modern async patterns,... |
| [pro](../../skills/pro/SKILL.md) | Coding | Provides Master enterprise-grade Scala development with... |
| [pro](../../skills/pro/SKILL.md) | Coding | "Provides Master TypeScript with advanced types, generics,... |
| [pro](../../skills/pro/SKILL.md) | Programming | "Master of defensive Bash scripting for production... |
| [pro](../../skills/pro/SKILL.md) | Programming | "Provides Professional, ethical HR partner for hiring,... |
| [pro](../../skills/pro/SKILL.md) | Programming | Provides Master modern SQL with cloud-native databases,... |
| [procedures](../../skills/procedures/SKILL.md) | Cncf | Provides Production deployment principles and... |
| [procurement](../../skills/procurement/SKILL.md) | Programming | "Provides Codified expertise for electricity and gas... |
| [product](../../skills/product/SKILL.md) | Programming | Provides Every product will be AI-powered. The question is... |
| [product](../../skills/product/SKILL.md) | Programming | "Provides Analytics de produto — PostHog, Mixpanel,... |
| [productivity](../../skills/productivity/SKILL.md) | Programming | "Provides Office productivity workflow covering document... |
| [profile-optimizer](../../skills/profile-optimizer/SKILL.md) | Programming | "Provides High-intent expert for LinkedIn profile checks,... |
| [profiling](../../skills/profiling/SKILL.md) | Programming | Provides Performance profiling principles. Measurement,... |
| [program](../../skills/program/SKILL.md) | Programming | Provides You are an expert in viral growth and referral... |
| [programmatic](../../skills/programmatic/SKILL.md) | Programming | Provides Plan and audit programmatic SEO pages generated at... |
| [programming-glsl](../../skills/programming-glsl/SKILL.md) | Programming | "Provides Expert guide for writing efficient GLSL shaders... |
| [programming-rust-project](../../skills/programming-rust-project/SKILL.md) | Programming | "Provides You are a Rust project architecture expert... |
| [project](../../skills/project/SKILL.md) | Agent | "Provides Forensic root cause analyzer for Antigravity... |
| [project-context](../../skills/project-context/SKILL.md) | Programming | "Provides Create or update a shared Apple design context... |
| [project-organizer](../../skills/project-organizer/SKILL.md) | Programming | "Provides Take a list of projects and their related... |
| [project-timesheet](../../skills/project-timesheet/SKILL.md) | Programming | 'Provides Expert guide for Odoo Project and Timesheets:... |
| [prompt](../../skills/prompt/SKILL.md) | Programming | "Transforms vague UI ideas into polished, Stitch-optimized... |
| [prompt-optimizer](../../skills/prompt-optimizer/SKILL.md) | Programming | Provides use when improving prompts for any llm. applies... |
| [proof-architect](../../skills/proof-architect/SKILL.md) | Programming | "Provides one sentence - what this skill does and when to... |
| [proofreader](../../skills/proofreader/SKILL.md) | Programming | "Provides use when a user asks to functionality and... |
| [prose](../../skills/prose/SKILL.md) | Programming | "Provides a hard-edged writing style contract for timeless,... |
| [protocol-templates](../../skills/protocol-templates/SKILL.md) | Programming | "Provides Implement DeFi protocols with production-ready... |
| [psychographic-profiler](../../skills/psychographic-profiler/SKILL.md) | Programming | "Provides one sentence - what this skill does and when to... |
| [psychologist](../../skills/psychologist/SKILL.md) | Programming | "Provides one sentence - what this skill does and when to... |
| [psychologist](../../skills/psychologist/SKILL.md) | Programming | "Provides one sentence - what this skill does and when to... |
| [psychologist](../../skills/psychologist/SKILL.md) | Programming | "Provides one sentence - what this skill does and when to... |
| [psychologist](../../skills/psychologist/SKILL.md) | Programming | "Provides one sentence - what this skill does and when to... |
| [psychologist](../../skills/psychologist/SKILL.md) | Programming | "Provides one sentence - what this skill does and when to... |
| [psychology](../../skills/psychology/SKILL.md) | Programming | "Provides Apply behavioral science and mental models to... |
| [psychology-strategist](../../skills/psychology-strategist/SKILL.md) | Programming | "Provides one sentence - what this skill does and when to... |
| [purchase-workflow](../../skills/purchase-workflow/SKILL.md) | Programming | "Provides Expert guide for Odoo Purchase: RFQ → PO →... |
| [pydantic-config](../../skills/pydantic-config/SKILL.md) | Coding | "Pydantic-based configuration management with frozen... |
| [pydantic-models](../../skills/pydantic-models/SKILL.md) | Coding | "'Pydantic frozen data models for trading: enums, annotated... |
| [python](../../skills/python/SKILL.md) | Programming | "Provides Guide for building reliable, fault-tolerant... |
| [python-patterns](../../skills/python-patterns/SKILL.md) | Programming | "Provides Comprehensive guidance for implementing... |
| [qa](../../skills/qa/SKILL.md) | Agent | Provides Comprehensive testing and QA workflow covering... |
| [qa](../../skills/qa/SKILL.md) | Programming | "Provides Answer repository questions grounded entirely in... |
| [qiskit](../../skills/qiskit/SKILL.md) | Programming | "Provides Qiskit is the world's most popular open-source... |
| [quality-frameworks](../../skills/quality-frameworks/SKILL.md) | Programming | "Provides Implement data quality validation with Great... |
| [query-expert](../../skills/query-expert/SKILL.md) | Coding | "Provides Expert in TanStack Query (React Query) —... |
| [qweb-templates](../../skills/qweb-templates/SKILL.md) | Programming | "Provides Expert in Odoo QWeb templating for PDF reports,... |
| [rails-project](../../skills/rails-project/SKILL.md) | Programming | "Provides create a new rails project functionality and... |
| [rails-upgrade](../../skills/rails-upgrade/SKILL.md) | Agent | "Implements analyze rails apps and provide upgrade... |
| [react](../../skills/react/SKILL.md) | Programming | Provides Practical patterns for using fp-ts with React -... |
| [readme](../../skills/readme/SKILL.md) | Programming | "Provides You are an expert technical writer creating... |
| [recallmax](../../skills/recallmax/SKILL.md) | Agent | "Provides FREE — God-tier long-context memory for AI... |
| [refactor](../../skills/refactor/SKILL.md) | Programming | "Provides Comprehensive guide for refactoring imperative... |
| [refactoring-context-restore](../../skills/refactoring-context-restore/SKILL.md) | Programming | Provides use when working with code refactoring context... |
| [refactoring-tech-debt](../../skills/refactoring-tech-debt/SKILL.md) | Programming | Provides You are a technical debt expert specializing in... |
| [reference](../../skills/reference/SKILL.md) | Programming | "Provides this category provides reference materials for... |
| [relationship-management](../../skills/relationship-management/SKILL.md) | Programming | "Provides Codified expertise for managing carrier... |
| [remotion](../../skills/remotion/SKILL.md) | Programming | "Provides Generate walkthrough videos from Stitch projects... |
| [research](../../skills/research/SKILL.md) | Programming | Provides Run autonomous research tasks that plan, search,... |
| [researcher](../../skills/researcher/SKILL.md) | Programming | "Provides You are an expert software engineer and systems... |
| [resource-manager-cosmosdb-dotnet](../../skills/resource-manager-cosmosdb-dotnet/SKILL.md) | Cncf | "Configures azure resource manager sdk for cosmos db in... |
| [resource-manager-durabletask-dotnet](../../skills/resource-manager-durabletask-dotnet/SKILL.md) | Cncf | "Provides Azure Resource Manager SDK for Durable Task... |
| [resource-manager-mysql-dotnet](../../skills/resource-manager-mysql-dotnet/SKILL.md) | Cncf | Provides Azure MySQL Flexible Server SDK for .NET. Database... |
| [resource-manager-playwright-dotnet](../../skills/resource-manager-playwright-dotnet/SKILL.md) | Cncf | "Provides Azure Resource Manager SDK for Microsoft... |
| [resource-manager-postgresql-dotnet](../../skills/resource-manager-postgresql-dotnet/SKILL.md) | Cncf | Provides Azure PostgreSQL Flexible Server SDK for .NET.... |
| [resource-manager-redis-dotnet](../../skills/resource-manager-redis-dotnet/SKILL.md) | Cncf | Configures azure resource manager sdk for redis in .net for... |
| [resource-manager-sql-dotnet](../../skills/resource-manager-sql-dotnet/SKILL.md) | Cncf | "Configures azure resource manager sdk for azure sql in... |
| [responder](../../skills/responder/SKILL.md) | Cncf | Provides Expert SRE incident responder specializing in... |
| [response-incident-response](../../skills/response-incident-response/SKILL.md) | Cncf | "Configures use when working with incident response... |
| [response-smart-fix](../../skills/response-smart-fix/SKILL.md) | Cncf | 'Provides [Extended thinking: This workflow implements a... |
| [reverse-logistics](../../skills/reverse-logistics/SKILL.md) | Programming | "Provides Codified expertise for returns authorisation,... |
| [review](../../skills/review/SKILL.md) | Coding | "Provides Master software architect specializing in modern... |
| [review](../../skills/review/SKILL.md) | Programming | "Provides Review UI code for StyleSeed design-system... |
| [review-ai-ai-review](../../skills/review-ai-ai-review/SKILL.md) | Programming | "Provides You are an expert AI-powered code review... |
| [review-excellence](../../skills/review-excellence/SKILL.md) | Programming | "Provides Transform code reviews from gatekeeping to... |
| [reviewer](../../skills/reviewer/SKILL.md) | Programming | "Provides Elite code review expert specializing in modern... |
| [revops](../../skills/revops/SKILL.md) | Programming | "Provides Design and improve revenue operations, lead... |
| [risco](../../skills/risco/SKILL.md) | Programming | "Provides Analise de risco em leiloes de imoveis. Score 36... |
| [risk-correlation-risk](../../skills/risk-correlation-risk/SKILL.md) | Trading | "Implements correlation breakdown and portfolio... |
| [risk-drawdown-control](../../skills/risk-drawdown-control/SKILL.md) | Trading | "Implements maximum drawdown control and equity... |
| [risk-kill-switches](../../skills/risk-kill-switches/SKILL.md) | Trading | "Implementing multi-layered kill switches at account,... |
| [risk-liquidity-risk](../../skills/risk-liquidity-risk/SKILL.md) | Trading | "Implements liquidity assessment and trade execution risk... |
| [risk-position-sizing](../../skills/risk-position-sizing/SKILL.md) | Trading | "Calculating optimal position sizes using Kelly criterion,... |
| [risk-stop-loss](../../skills/risk-stop-loss/SKILL.md) | Trading | "Implements stop loss strategies for risk management for... |
| [risk-stress-testing](../../skills/risk-stress-testing/SKILL.md) | Trading | "Implements stress test scenarios and portfolio resilience... |
| [risk-tail-risk](../../skills/risk-tail-risk/SKILL.md) | Trading | "Implements tail risk management and extreme event... |
| [risk-value-at-risk](../../skills/risk-value-at-risk/SKILL.md) | Trading | "Implements value at risk calculations for portfolio risk... |
| [rod-master](../../skills/rod-master/SKILL.md) | Programming | "Provides Comprehensive guide for browser automation and... |
| [router](../../skills/router/SKILL.md) | Agent | "Provides use when the user is unsure which skill to use or... |
| [router-py](../../skills/router-py/SKILL.md) | Coding | "Provides Create FastAPI routers following established... |
| [rpc-api](../../skills/rpc-api/SKILL.md) | Programming | "Provides Expert on Odoo's external JSON-RPC and XML-RPC... |
| [runbook-templates](../../skills/runbook-templates/SKILL.md) | Cncf | "Provides Production-ready templates for incident response... |
| [saas-launcher](../../skills/saas-launcher/SKILL.md) | Programming | "Provides Expert in launching small, focused SaaS products... |
| [safety-patterns](../../skills/safety-patterns/SKILL.md) | Programming | "Provides Cross-language patterns for memory-safe... |
| [sales-crm-expert](../../skills/sales-crm-expert/SKILL.md) | Programming | 'Provides Expert guide for Odoo Sales and CRM: pipeline... |
| [satori](../../skills/satori/SKILL.md) | Programming | "Provides Clinically informed wisdom companion blending... |
| [scanner](../../skills/scanner/SKILL.md) | Agent | "Provides Scan agent skills for security issues before... |
| [scanpy](../../skills/scanpy/SKILL.md) | Programming | Provides Scanpy is a scalable Python toolkit for analyzing... |
| [scheduling](../../skills/scheduling/SKILL.md) | Programming | "Provides Codified expertise for production scheduling, job... |
| [schema](../../skills/schema/SKILL.md) | Programming | "Detect, validate, and generate Schema.org structured data.... |
| [scientific-skills](../../skills/scientific-skills/SKILL.md) | Programming | Provides scientific research and analysis skills... |
| [scientist](../../skills/scientist/SKILL.md) | Programming | Provides Expert data scientist for advanced analytics,... |
| [scraper](../../skills/scraper/SKILL.md) | Programming | Provides Deep web scraping, screenshots, PDF parsing, and... |
| [scraper](../../skills/scraper/SKILL.md) | Programming | Provides Web scraping inteligente multi-estrategia. Extrai... |
| [screenshots](../../skills/screenshots/SKILL.md) | Programming | "Provides Generate marketing screenshots of your app using... |
| [scripting](../../skills/scripting/SKILL.md) | Agent | "Provides Bash scripting workflow for creating... |
| [scripting](../../skills/scripting/SKILL.md) | Agent | "Provides Operating system and shell scripting... |
| [sdk](../../skills/sdk/SKILL.md) | Coding | "Provides Build applications that programmatically interact... |
| [seaborn](../../skills/seaborn/SKILL.md) | Programming | Provides Seaborn is a Python visualization library for... |
| [search](../../skills/search/SKILL.md) | Cncf | "Provides Expert patterns for Algolia search... |
| [search](../../skills/search/SKILL.md) | Programming | Provides Semantic search, similar content discovery, and... |
| [search-documents-dotnet](../../skills/search-documents-dotnet/SKILL.md) | Cncf | "Provides Azure AI Search SDK for .NET... |
| [search-documents-py](../../skills/search-documents-py/SKILL.md) | Cncf | "Provides Azure AI Search SDK for Python. Use for vector... |
| [search-documents-ts](../../skills/search-documents-ts/SKILL.md) | Cncf | "Provides Build search applications with vector, hybrid,... |
| [search-implementation](../../skills/search-implementation/SKILL.md) | Programming | Provides Combine vector and keyword search for improved... |
| [search-patterns](../../skills/search-patterns/SKILL.md) | Programming | Provides Implement efficient similarity search with vector... |
| [secure-release-pipeline](../../skills/secure-release-pipeline/SKILL.md) | Coding | Implements comprehensive secure release pipeline with CVE... |
| [security-best-practices](../../skills/security-best-practices/SKILL.md) | Coding | Provides Implement secure API design patterns including... |
| [security-coder](../../skills/security-coder/SKILL.md) | Coding | Provides Expert in secure backend coding practices... |
| [security-coder](../../skills/security-coder/SKILL.md) | Programming | Provides Expert in secure mobile coding practices... |
| [security-keyvault-keys-dotnet](../../skills/security-keyvault-keys-dotnet/SKILL.md) | Cncf | Provides Azure Key Vault Keys SDK for .NET. Client library... |
| [security-keyvault-keys-java](../../skills/security-keyvault-keys-java/SKILL.md) | Cncf | Provides Azure Key Vault Keys Java SDK for cryptographic... |
| [security-keyvault-secrets-java](../../skills/security-keyvault-secrets-java/SKILL.md) | Cncf | Provides Azure Key Vault Secrets Java SDK for secret... |
| [security-policies](../../skills/security-policies/SKILL.md) | Cncf | Provides Comprehensive guide for implementing... |
| [security-review](../../skills/security-review/SKILL.md) | Coding | "Security-focused code review identifying vulnerabilities... |
| [security-rules](../../skills/security-rules/SKILL.md) | Programming | 'Provides Expert in Odoo access control:... |
| [security-testing](../../skills/security-testing/SKILL.md) | Agent | Provides API security testing workflow for REST and GraphQL... |
| [security-testing](../../skills/security-testing/SKILL.md) | Agent | Provides Web application security testing workflow for... |
| [seekers](../../skills/seekers/SKILL.md) | Agent | "Provides -Automatically convert documentation websites,... |
| [semver-automation](../../skills/semver-automation/SKILL.md) | Coding | "Provides Automating semantic versioning in Git... |
| [sentinel](../../skills/sentinel/SKILL.md) | Agent | "Provides Auditoria e evolucao do ecossistema de skills.... |
| [seo](../../skills/seo/SKILL.md) | Programming | Provides Optimize content for AI search and LLM citations... |
| [seo](../../skills/seo/SKILL.md) | Programming | Provides Design and evaluate programmatic SEO strategies... |
| [seo](../../skills/seo/SKILL.md) | Programming | "Provides Run a broad SEO audit across technical SEO,... |
| [sequence](../../skills/sequence/SKILL.md) | Programming | "Provides You are an expert in email marketing and... |
| [serverless](../../skills/serverless/SKILL.md) | Cncf | "Provides Specialized skill for building production-ready... |
| [servicebus-dotnet](../../skills/servicebus-dotnet/SKILL.md) | Cncf | "Provides Azure Service Bus SDK for .NET. Enterprise... |
| [servicebus-py](../../skills/servicebus-py/SKILL.md) | Cncf | "Provides Azure Service Bus SDK for Python messaging. Use... |
| [servicebus-ts](../../skills/servicebus-ts/SKILL.md) | Cncf | "Configures enterprise messaging with queues, topics, and... |
| [settings-audit](../../skills/settings-audit/SKILL.md) | Programming | Provides Analyze a repository to generate recommended... |
| [setup](../../skills/setup/SKILL.md) | Programming | "Creates devcontainers with Claude Code, language-specific... |
| [setup](../../skills/setup/SKILL.md) | Programming | "Provides Interactive StyleSeed setup wizard for choosing... |
| [setup-guide](../../skills/setup-guide/SKILL.md) | Programming | "Provides Guide developers through setting up development... |
| [shadcn](../../skills/shadcn/SKILL.md) | Coding | "Manages shadcn/ui components and projects, providing... |
| [shaders](../../skills/shaders/SKILL.md) | Programming | "CRITICAL: Use for Makepad shader system. Triggers on"... |
| [shaders](../../skills/shaders/SKILL.md) | Programming | "Provides Three.js shaders - GLSL, ShaderMaterial,... |
| [sheets-automation](../../skills/sheets-automation/SKILL.md) | Programming | "Provides Lightweight Google Sheets integration with... |
| [shell-pro](../../skills/shell-pro/SKILL.md) | Programming | "Provides Expert in strict POSIX sh scripting for maximum... |
| [shell-reliability](../../skills/shell-reliability/SKILL.md) | Programming | 'Provides Reliable command execution on Windows: paths,... |
| [shell-scripting](../../skills/shell-scripting/SKILL.md) | Programming | "Provides Provide production-ready shell script templates... |
| [shopify-integration](../../skills/shopify-integration/SKILL.md) | Programming | 'Provides Connect Odoo with Shopify: sync products,... |
| [simplifier](../../skills/simplifier/SKILL.md) | Programming | "Provides Simplifies and refines code for clarity,... |
| [sitemap](../../skills/sitemap/SKILL.md) | Programming | "Provides Analyze existing XML sitemaps or generate new... |
| [sizing-analysis](../../skills/sizing-analysis/SKILL.md) | Programming | "Provides Comprehensive market sizing methodologies for... |
| [skill](../../skills/skill/SKILL.md) | Cncf | Configures terraform infrastructure as code best practices... |
| [skill-audit](../../skills/skill-audit/SKILL.md) | Programming | "Provides Audit a project and recommend the highest-value... |
| [skill-backend-patterns](../../skills/skill-backend-patterns/SKILL.md) | Agent | Provides Backend architecture patterns, API design,... |
| [skill-clickhouse-io](../../skills/skill-clickhouse-io/SKILL.md) | Agent | Provides ClickHouse database patterns, query optimization,... |
| [skill-coding-standards](../../skills/skill-coding-standards/SKILL.md) | Agent | "Provides Universal coding standards, best practices, and... |
| [skill-continuous-learning](../../skills/skill-continuous-learning/SKILL.md) | Agent | "Implements development skill from everything-claude-code... |
| [skill-frontend-patterns](../../skills/skill-frontend-patterns/SKILL.md) | Agent | "Provides Frontend development patterns for React, Next.js,... |
| [skill-orchestrator](../../skills/skill-orchestrator/SKILL.md) | Agent | "Provides a meta-skill that understands task requirements,... |
| [skill-project-guidelines-example](../../skills/skill-project-guidelines-example/SKILL.md) | Agent | "Implements project guidelines skill (example) for... |
| [skill-security-review](../../skills/skill-security-review/SKILL.md) | Agent | Provides this skill ensures all code follows security best... |
| [skill-strategic-compact](../../skills/skill-strategic-compact/SKILL.md) | Agent | "Implements development skill from everything-claude-code... |
| [skills](../../skills/skills/SKILL.md) | Agent | "Implements use when creating, updating, or improving agent... |
| [skills](../../skills/skills/SKILL.md) | Cncf | "Provides AWS development with infrastructure automation... |
| [skills](../../skills/skills/SKILL.md) | Programming | 'Provides Makepad UI development skills for Rust apps:... |
| [skills](../../skills/skills/SKILL.md) | Programming | Provides Discover, list, create, edit, toggle, copy, move,... |
| [skills](../../skills/skills/SKILL.md) | Programming | "Provides Create 3D scenes, interactive experiences, and... |
| [skills](../../skills/skills/SKILL.md) | Programming | Provides Opinionated, evolving constraints to guide agents... |
| [skills](../../skills/skills/SKILL.md) | Programming | "Provides Upload, stream, search, edit, transcribe, and... |
| [slides](../../skills/slides/SKILL.md) | Programming | "Provides Create stunning, animation-rich HTML... |
| [slides-automation](../../skills/slides-automation/SKILL.md) | Programming | "Provides Lightweight Google Slides integration with... |
| [snippet-hunter](../../skills/snippet-hunter/SKILL.md) | Programming | "Provides Formats content to be eligible for featured... |
| [sourcing-architect](../../skills/sourcing-architect/SKILL.md) | Coding | "Provides Expert in event sourcing, CQRS, and event-driven... |
| [spec-generation](../../skills/spec-generation/SKILL.md) | Cncf | "Provides Generate and maintain OpenAPI 3.1 specifications... |
| [specialist](../../skills/specialist/SKILL.md) | Cncf | Provides Expert Terraform/OpenTofu specialist mastering... |
| [specialist](../../skills/specialist/SKILL.md) | Coding | "Provides BullMQ expert for Redis-backed job queues,... |
| [specialist](../../skills/specialist/SKILL.md) | Programming | "Provides expert web researcher using advanced search... |
| [speech-to-text-rest-py](../../skills/speech-to-text-rest-py/SKILL.md) | Cncf | "Provides Azure Speech to Text REST API for short audio... |
| [speed](../../skills/speed/SKILL.md) | Programming | Provides launch rsvp speed reader for text functionality... |
| [speed-reader](../../skills/speed-reader/SKILL.md) | Programming | Provides -Speed read Claude's responses at 600+ WPM using... |
| [spells](../../skills/spells/SKILL.md) | Programming | "Provides curated micro-interactions and design details... |
| [splash](../../skills/splash/SKILL.md) | Programming | "CRITICAL: Use for Makepad Splash scripting language.... |
| [spm-app-packaging](../../skills/spm-app-packaging/SKILL.md) | Programming | "Provides Scaffold, build, sign, and package SwiftPM macOS... |
| [stage-mapper](../../skills/stage-mapper/SKILL.md) | Programming | "Provides one sentence - what this skill does and when to... |
| [standards](../../skills/standards/SKILL.md) | Programming | Provides Master ERC-721 and ERC-1155 NFT standards,... |
| [state-management](../../skills/state-management/SKILL.md) | Programming | "Provides Master modern Angular state management with... |
| [state-management](../../skills/state-management/SKILL.md) | Programming | "Provides Master modern React state management with Redux... |
| [statsmodels](../../skills/statsmodels/SKILL.md) | Programming | "Provides Statsmodels is Python's premier library for... |
| [stock-research](../../skills/stock-research/SKILL.md) | Programming | Provides Thesis-driven equity analysis from public SEC... |
| [storage-blob-java](../../skills/storage-blob-java/SKILL.md) | Cncf | "Provides Build blob storage applications using the Azure... |
| [storage-blob-py](../../skills/storage-blob-py/SKILL.md) | Cncf | "Provides Azure Blob Storage SDK for Python. Use for... |
| [storage-blob-rust](../../skills/storage-blob-rust/SKILL.md) | Cncf | "Provides Azure Blob Storage SDK for Rust. Use for... |
| [storage-blob-ts](../../skills/storage-blob-ts/SKILL.md) | Cncf | "Provides Azure Blob Storage JavaScript/TypeScript SDK... |
| [storage-file-datalake-py](../../skills/storage-file-datalake-py/SKILL.md) | Cncf | Provides Azure Data Lake Storage Gen2 SDK for Python. Use... |
| [storage-file-share-py](../../skills/storage-file-share-py/SKILL.md) | Cncf | "Provides Azure Storage File Share SDK for Python. Use for... |
| [storage-file-share-ts](../../skills/storage-file-share-ts/SKILL.md) | Cncf | "Provides Azure File Share JavaScript/TypeScript SDK... |
| [storage-queue-py](../../skills/storage-queue-py/SKILL.md) | Cncf | "Provides Azure Queue Storage SDK for Python. Use for... |
| [storage-queue-ts](../../skills/storage-queue-ts/SKILL.md) | Cncf | "Provides Azure Queue Storage JavaScript/TypeScript SDK... |
| [store-changelog](../../skills/store-changelog/SKILL.md) | Programming | "Provides Generate user-facing App Store release notes from... |
| [store-design](../../skills/store-design/SKILL.md) | Coding | "Provides Design and implement event stores for... |
| [store-optimization](../../skills/store-optimization/SKILL.md) | Programming | "Provides Complete App Store Optimization (ASO) toolkit for... |
| [store-ts](../../skills/store-ts/SKILL.md) | Coding | "Provides Create Zustand stores following established... |
| [storytelling](../../skills/storytelling/SKILL.md) | Programming | Provides Transform raw data into compelling narratives that... |
| [strategic-design](../../skills/strategic-design/SKILL.md) | Coding | "Provides Design DDD strategic artifacts including... |
| [strategies](../../skills/strategies/SKILL.md) | Coding | "Provides Transform debugging from frustrating guesswork... |
| [strategies](../../skills/strategies/SKILL.md) | Programming | Provides Guide to selecting and optimizing embedding models... |
| [strategy](../../skills/strategy/SKILL.md) | Programming | "Provides Plan a content strategy, topic clusters,... |
| [strategy](../../skills/strategy/SKILL.md) | Programming | "Provides You are an expert in SaaS product launches and... |
| [strategy](../../skills/strategy/SKILL.md) | Programming | "Provides Design pricing, packaging, and monetization... |
| [strategy-base](../../skills/strategy-base/SKILL.md) | Coding | "Abstract base strategy pattern with initialization guards,... |
| [structure-architect](../../skills/structure-architect/SKILL.md) | Programming | "Analyzes and optimizes content structure including header... |
| [structure-protocol](../../skills/structure-protocol/SKILL.md) | Programming | "Provides Give agents persistent structural memory of a... |
| [structured-output](../../skills/structured-output/SKILL.md) | Programming | "Get reliable JSON, enums, and typed objects from LLMs... |
| [studio](../../skills/studio/SKILL.md) | Programming | "Provides Studio de geracao de imagens inteligente —... |
| [studio-image](../../skills/studio-image/SKILL.md) | Programming | Provides Geracao de imagens humanizadas via Google AI... |
| [summarizer](../../skills/summarizer/SKILL.md) | Programming | "Provides Extract transcripts from YouTube videos and... |
| [supabase-auth](../../skills/supabase-auth/SKILL.md) | Programming | "Provides expert integration of supabase auth with next.js... |
| [superpowers](../../skills/superpowers/SKILL.md) | Agent | "Provides use when starting any conversation - establishes... |
| [support](../../skills/support/SKILL.md) | Programming | "Provides Elite AI-powered customer support specialist... |
| [sutskever](../../skills/sutskever/SKILL.md) | Programming | "Provides Agente que simula Ilya Sutskever — co-fundador da... |
| [sveltekit](../../skills/sveltekit/SKILL.md) | Coding | "Provides Build full-stack web applications with SvelteKit... |
| [sympy](../../skills/sympy/SKILL.md) | Programming | "Provides SymPy is a Python library for symbolic... |
| [systems](../../skills/systems/SKILL.md) | Agent | "Provides Design short-term, long-term, and graph-based... |
| [systems](../../skills/systems/SKILL.md) | Programming | "Provides Email has the highest ROI of any marketing... |
| [tactical-patterns](../../skills/tactical-patterns/SKILL.md) | Coding | "Provides Apply DDD tactical patterns in code using... |
| [tailwind-setup](../../skills/tailwind-setup/SKILL.md) | Programming | "Provides Set up Tailwind CSS v4 in Expo with... |
| [tao](../../skills/tao/SKILL.md) | Programming | "Provides Matemático ultra-avançado inspirado em Terence... |
| [taskeither-ref](../../skills/taskeither-ref/SKILL.md) | Programming | "Provides Quick reference for TaskEither. Use when user... |
| [taste](../../skills/taste/SKILL.md) | Coding | "Provides use when generating elite gsap-heavy frontend... |
| [taste-frontend](../../skills/taste-frontend/SKILL.md) | Coding | "Provides use when building high-agency frontend interfaces... |
| [teams-automation](../../skills/teams-automation/SKILL.md) | Cncf | 'Provides Automate Microsoft Teams tasks via Rube MCP... |
| [tech](../../skills/tech/SKILL.md) | Programming | Provides Integrate multiple digital health data sources,... |
| [technical](../../skills/technical/SKILL.md) | Programming | "Provides Audit technical SEO across crawlability,... |
| [technical-cycle-analysis](../../skills/technical-cycle-analysis/SKILL.md) | Trading | "Implements market cycles and periodic patterns in price... |
| [technical-false-signal-filtering](../../skills/technical-false-signal-filtering/SKILL.md) | Trading | "Provides False Signal Filtering Techniques for Robust... |
| [technical-indicator-confluence](../../skills/technical-indicator-confluence/SKILL.md) | Trading | "Provides Indicator Confluence Validation Systems for... |
| [technical-intermarket-analysis](../../skills/technical-intermarket-analysis/SKILL.md) | Trading | "Implements cross-market relationships and asset class... |
| [technical-market-microstructure](../../skills/technical-market-microstructure/SKILL.md) | Trading | "Implements order book dynamics and order flow analysis for... |
| [technical-momentum-indicators](../../skills/technical-momentum-indicators/SKILL.md) | Trading | "Implements rsi, macd, stochastic oscillators and momentum... |
| [technical-price-action-patterns](../../skills/technical-price-action-patterns/SKILL.md) | Trading | "Provides Analysis of candlestick and chart patterns for... |
| [technical-regime-detection](../../skills/technical-regime-detection/SKILL.md) | Trading | "Provides Market Regime Detection Systems for Adaptive... |
| [technical-statistical-arbitrage](../../skills/technical-statistical-arbitrage/SKILL.md) | Trading | "Implements pair trading and cointegration-based arbitrage... |
| [technical-support-resistance](../../skills/technical-support-resistance/SKILL.md) | Trading | "Implements technical levels where price tends to pause or... |
| [technical-trend-analysis](../../skills/technical-trend-analysis/SKILL.md) | Trading | "Provides Trend identification, classification, and... |
| [technical-volatility-analysis](../../skills/technical-volatility-analysis/SKILL.md) | Trading | "Implements volatility measurement, forecasting, and risk... |
| [technical-volume-profile](../../skills/technical-volume-profile/SKILL.md) | Trading | "Provides Volume analysis techniques for understanding... |
| [technologies](../../skills/technologies/SKILL.md) | Programming | "Provides Check for .claude/apple-design-context.md before... |
| [telegram](../../skills/telegram/SKILL.md) | Coding | "Provides Integracao completa com Telegram Bot API. Setup... |
| [template-business](../../skills/template-business/SKILL.md) | Programming | "Provides Expert in building and selling Notion templates... |
| [templates](../../skills/templates/SKILL.md) | Coding | "Provides Create production-ready FastAPI projects with... |
| [templates](../../skills/templates/SKILL.md) | Coding | "Provides Project scaffolding templates for new... |
| [templates](../../skills/templates/SKILL.md) | Programming | "Provides Documentation templates and structure guidelines.... |
| [test-driven-development](../../skills/test-driven-development/SKILL.md) | Coding | "Test-Driven Development (TDD) and Behavior-Driven... |
| [test-setup](../../skills/test-setup/SKILL.md) | Programming | "Provides Structured guide for setting up A/B tests with... |
| [testing](../../skills/testing/SKILL.md) | Agent | Provides End-to-end testing workflow with Playwright for... |
| [testing](../../skills/testing/SKILL.md) | Programming | Provides Master comprehensive testing strategies for smart... |
| [testing-observability-api-mock](../../skills/testing-observability-api-mock/SKILL.md) | Coding | Provides You are an API mocking expert specializing in... |
| [testing-patterns](../../skills/testing-patterns/SKILL.md) | Programming | Provides Comprehensive guide for implementing robust... |
| [testing-patterns](../../skills/testing-patterns/SKILL.md) | Programming | Provides Implement comprehensive testing strategies with... |
| [testing-review-ai-review](../../skills/testing-review-ai-review/SKILL.md) | Programming | Provides You are an expert AI-powered code review... |
| [testing-review-multi-agent-review](../../skills/testing-review-multi-agent-review/SKILL.md) | Programming | Provides use when working with performance testing review... |
| [textures](../../skills/textures/SKILL.md) | Programming | "Provides Three.js textures - texture types, UV mapping,... |
| [theme-development](../../skills/theme-development/SKILL.md) | Agent | "Provides WordPress theme development workflow covering... |
| [tmux](../../skills/tmux/SKILL.md) | Programming | "Provides Expert tmux session, window, and pane management... |
| [to-be-done-analyst](../../skills/to-be-done-analyst/SKILL.md) | Programming | "Provides one sentence - what this skill does and when to... |
| [to-wordpress-converter](../../skills/to-wordpress-converter/SKILL.md) | Programming | "Provides Expert skill for converting any codebase... |
| [tokens](../../skills/tokens/SKILL.md) | Programming | "Provides List, add, and update StyleSeed design tokens... |
| [tool-builder](../../skills/tool-builder/SKILL.md) | Programming | Provides Tools are how AI agents interact with the world. A... |
| [tool-builder](../../skills/tool-builder/SKILL.md) | Programming | "Provides Expert in building custom tools that solve your... |
| [tool-strategy](../../skills/tool-strategy/SKILL.md) | Programming | "Provides You are an expert in engineering-as-marketing... |
| [toolkit-smart-debug](../../skills/toolkit-smart-debug/SKILL.md) | Programming | "Provides use when working with debugging toolkit smart... |
| [tracing](../../skills/tracing/SKILL.md) | Cncf | Provides Implement distributed tracing with Jaeger and... |
| [tracking](../../skills/tracking/SKILL.md) | Programming | Provides Design, audit, and improve analytics tracking... |
| [trade-compliance](../../skills/trade-compliance/SKILL.md) | Programming | "Provides Codified expertise for customs documentation,... |
| [traffic-management](../../skills/traffic-management/SKILL.md) | Cncf | Provides Comprehensive guide to Istio traffic management... |
| [transcriber](../../skills/transcriber/SKILL.md) | Agent | "Provides Transform audio recordings into professional... |
| [transformation-patterns](../../skills/transformation-patterns/SKILL.md) | Programming | "Provides Production-ready patterns for dbt (data build... |
| [trend-analysis](../../skills/trend-analysis/SKILL.md) | Agent | Provides Discover and track emerging trends across Google... |
| [trend-analyzer](../../skills/trend-analyzer/SKILL.md) | Programming | "Provides 分析一段时间内健康数 据的趋势和模式。关联药物、症 状、生命体征、化验结果和其他... |
| [troubleshooter](../../skills/troubleshooter/SKILL.md) | Cncf | "Provides Expert DevOps troubleshooter specializing in... |
| [troubleshooting](../../skills/troubleshooting/SKILL.md) | Agent | "Provides Linux system troubleshooting workflow for... |
| [trust-metadata](../../skills/trust-metadata/SKILL.md) | Programming | "Provides the ai native file format. exif for ai — stamps... |
| [ts-errors](../../skills/ts-errors/SKILL.md) | Programming | "Provides Handle errors as values using fp-ts Either and... |
| [ts-pragmatic](../../skills/ts-pragmatic/SKILL.md) | Programming | "Provides a practical, jargon-free guide to fp-ts... |
| [ts-react](../../skills/ts-react/SKILL.md) | Programming | Provides Practical patterns for using fp-ts with React -... |
| [twitter-scraper](../../skills/twitter-scraper/SKILL.md) | Programming | "Provides X (Twitter) data platform skill — tweet search,... |
| [types-ref](../../skills/types-ref/SKILL.md) | Programming | "Provides Quick reference for fp-ts types. Use when user... |
| [typescript](../../skills/typescript/SKILL.md) | Programming | "Provides Guide for building reliable, fault-tolerant... |
| [typescript-typescript-scaffold](../../skills/typescript-typescript-scaffold/SKILL.md) | Coding | "Provides You are a TypeScript project architecture expert... |
| [ui](../../skills/ui/SKILL.md) | Coding | "Provides use when creating clean editorial interfaces with... |
| [ui](../../skills/ui/SKILL.md) | Programming | "Validates animation durations, enforces typography scale,... |
| [ui-dark-ts](../../skills/ui-dark-ts/SKILL.md) | Programming | Provides a modern dark-themed react ui system using... |
| [ui-design](../../skills/ui-design/SKILL.md) | Programming | "Provides Expert guidance for crafting effective prompts in... |
| [ui-design-system](../../skills/ui-design-system/SKILL.md) | Programming | "Provides Build accessible design systems with Radix UI... |
| [ui-generator](../../skills/ui-generator/SKILL.md) | Programming | "Provides Utilizes Magic by 21st.dev to generate, compare,... |
| [ui-jetpack-compose](../../skills/ui-jetpack-compose/SKILL.md) | Programming | "Provides expo-ui-jetpack-compose functionality and... |
| [ui-patterns](../../skills/ui-patterns/SKILL.md) | Programming | Provides Modern Angular UI patterns for loading states,... |
| [ui-patterns](../../skills/ui-patterns/SKILL.md) | Programming | Provides Modern React UI patterns for loading states, error... |
| [ui-patterns](../../skills/ui-patterns/SKILL.md) | Programming | "Provides Apply proven SwiftUI UI patterns for navigation,... |
| [ui-swift-ui](../../skills/ui-swift-ui/SKILL.md) | Programming | "Provides expo-ui-swift-ui functionality and capabilities." |
| [ultimate-scraper](../../skills/ultimate-scraper/SKILL.md) | Agent | Provides AI-driven data extraction from 55+ Actors across... |
| [updater](../../skills/updater/SKILL.md) | Programming | "Provides speckit safe update functionality and... |
| [upgrade](../../skills/upgrade/SKILL.md) | Programming | "Provides Master major dependency version upgrades,... |
| [upgrade-advisor](../../skills/upgrade-advisor/SKILL.md) | Programming | 'Provides Step-by-step Odoo version upgrade advisor:... |
| [upgrade-cro](../../skills/upgrade-cro/SKILL.md) | Programming | "Provides You are an expert in in-app paywalls and upgrade... |
| [upscale](../../skills/upscale/SKILL.md) | Programming | Provides upscale and enhance image and video resolution... |
| [urgency-psychologist](../../skills/urgency-psychologist/SKILL.md) | Programming | "Provides one sentence - what this skill does and when to... |
| [use](../../skills/use/SKILL.md) | Programming | "Provides Build and maintain Rayden UI components and... |
| [use-agents](../../skills/use-agents/SKILL.md) | Programming | Provides Build AI agents that interact with computers like... |
| [use-guardian](../../skills/use-guardian/SKILL.md) | Cncf | "Provides FREE — Intelligent tool-call reliability wrapper.... |
| [ux-designer](../../skills/ux-designer/SKILL.md) | Programming | "Provides Create interface designs, wireframes, and design... |
| [ux-pro-max](../../skills/ux-pro-max/SKILL.md) | Coding | "Provides Comprehensive design guide for web and mobile... |
| [v2-py](../../skills/v2-py/SKILL.md) | Programming | Provides Build container-based Foundry Agents with Azure AI... |
| [validation-config-validate](../../skills/validation-config-validate/SKILL.md) | Cncf | Provides You are a configuration management expert... |
| [validation-expert](../../skills/validation-expert/SKILL.md) | Agent | Provides Expert guide for interpreting and fixing n8n... |
| [validation-expert](../../skills/validation-expert/SKILL.md) | Coding | "Provides Expert in Zod — TypeScript-first schema... |
| [vantage](../../skills/vantage/SKILL.md) | Programming | 'Provides Access 20+ years of global financial data:... |
| [vexor](../../skills/vexor/SKILL.md) | Programming | "Provides Vector-powered CLI for semantic file search with... |
| [viboscope](../../skills/viboscope/SKILL.md) | Agent | "Provides Psychological compatibility matching — find... |
| [videodb](../../skills/videodb/SKILL.md) | Programming | "Provides Video and audio perception, indexing, and... |
| [view-refactor](../../skills/view-refactor/SKILL.md) | Programming | Provides Refactor SwiftUI views into smaller components... |
| [viewmodels-zafiro](../../skills/viewmodels-zafiro/SKILL.md) | Programming | "Provides Optimal ViewModel and Wizard creation patterns... |
| [vision-expert](../../skills/vision-expert/SKILL.md) | Programming | Provides SOTA Computer Vision Expert (2026). Specialized in... |
| [visual-validator](../../skills/visual-validator/SKILL.md) | Programming | "Provides Rigorous visual validation expert specializing in... |
| [vitepress](../../skills/vitepress/SKILL.md) | Programming | "Provides Transform generated wiki Markdown files into a... |
| [vizcom](../../skills/vizcom/SKILL.md) | Programming | "Provides AI-powered product design tool for transforming... |
| [web](../../skills/web/SKILL.md) | Programming | Provides Web search, content extraction, crawling, and... |
| [web-app](../../skills/web-app/SKILL.md) | Coding | "Provides Build Progressive Web Apps (PWAs) with offline... |
| [web-experience](../../skills/web-experience/SKILL.md) | Programming | "Provides Expert in building 3D experiences for the web -... |
| [web-pubsub-ts](../../skills/web-pubsub-ts/SKILL.md) | Cncf | "Provides Real-time messaging with WebSocket connections... |
| [websocket-manager](../../skills/websocket-manager/SKILL.md) | Coding | "WebSocket connection manager with state machine... |
| [widget](../../skills/widget/SKILL.md) | Coding | "Provides Build a real-time support chat system with a... |
| [widget-patterns](../../skills/widget-patterns/SKILL.md) | Programming | "CRITICAL: Use for Robius widget patterns. Triggers on"... |
| [widgets](../../skills/widgets/SKILL.md) | Programming | 'Provides Version: makepad-widgets (dev branch) | Last... |
| [win11-speckit-update-skill](../../skills/win11-speckit-update-skill/SKILL.md) | Programming | Provides windows 11 system management functionality and... |
| [window-management](../../skills/window-management/SKILL.md) | Agent | "Provides Strategies for managing LLM context windows... |
| [windows](../../skills/windows/SKILL.md) | Programming | "Provides PowerShell Windows patterns. Critical pitfalls,... |
| [wizard](../../skills/wizard/SKILL.md) | Programming | "Provides Done-for-you .faf generator. One-click AI context... |
| [woocommerce-bridge](../../skills/woocommerce-bridge/SKILL.md) | Programming | 'Provides Sync Odoo with WooCommerce: products, inventory,... |
| [woocommerce-development](../../skills/woocommerce-development/SKILL.md) | Agent | 'Provides WooCommerce store development workflow covering... |
| [wordpress](../../skills/wordpress/SKILL.md) | Agent | "Provides Complete WordPress development workflow covering... |
| [work-summary](../../skills/work-summary/SKILL.md) | Programming | "Provides Go back through the previous year of work and... |
| [workers-expert](../../skills/workers-expert/SKILL.md) | Coding | "Provides Expert in Cloudflare Workers and the Edge... |
| [workflow](../../skills/workflow/SKILL.md) | Cncf | "Provides Complete guide to implementing GitOps workflows... |
| [workflow](../../skills/workflow/SKILL.md) | Programming | Provides generate workflow json files for chaining ai... |
| [workflow-patterns](../../skills/workflow-patterns/SKILL.md) | Agent | Implements proven architectural patterns for building n8n... |
| [workspace-patterns](../../skills/workspace-patterns/SKILL.md) | Programming | "Provides Configure and optimize Nx monorepo workspaces.... |
| [wrapper-product](../../skills/wrapper-product/SKILL.md) | Programming | Provides Expert in building products that wrap AI APIs... |
| [writer](../../skills/writer/SKILL.md) | Agent | "Provides Create and improve agent skills following the... |
| [writer](../../skills/writer/SKILL.md) | Programming | "Provides Document creation, format conversion... |
| [writing](../../skills/writing/SKILL.md) | Cncf | Provides Comprehensive guide to writing effective,... |
| [writing](../../skills/writing/SKILL.md) | Programming | "Provides this is the core skill for the deep research and... |
| [writing-guide](../../skills/writing-guide/SKILL.md) | Programming | "Provides this skill enforces sentry's blog writing... |
| [xml-views-builder](../../skills/xml-views-builder/SKILL.md) | Programming | 'Provides Expert at building Odoo XML views: Form, List,... |
| [zafiro-development](../../skills/zafiro-development/SKILL.md) | Programming | "Provides Mandatory skills, conventions, and behavioral... |


### Reference (Learn & Understand) (156 skills)

| Skill Name | Domain | Description |
|---|---|---|
| [abl-v10-learning](../../skills/abl-v10-learning/SKILL.md) | Programming | "Reference guide for Progress OpenEdge ABL 10.1A (2005) —... |
| [abl-v12-learning](../../skills/abl-v12-learning/SKILL.md) | Programming | "Reference guide for Progress OpenEdge ABL 12.7 (2023) —... |
| [algorithms](../../skills/algorithms/SKILL.md) | Programming | ''Provides Comprehensive algorithm selection guide u2014... |
| [app-architecture](../../skills/app-architecture/SKILL.md) | Programming | ''CRITICAL: Use for Robius app architecture patterns.... |
| [architectural-patterns](../../skills/architectural-patterns/SKILL.md) | Coding | "Provides Software architecture patterns including MVC,... |
| [architecture-best-practices](../../skills/architecture-best-practices/SKILL.md) | Cncf | "Cloud Native Computing Foundation (CNCF) architecture best... |
| [argo](../../skills/argo/SKILL.md) | Cncf | "Argo in Cloud-Native Engineering - Kubernetes-Native... |
| [artifact-hub](../../skills/artifact-hub/SKILL.md) | Cncf | "Provides Artifact Hub in Cloud-Native Engineering -... |
| [aws-auto-scaling](../../skills/aws-auto-scaling/SKILL.md) | Cncf | "Configures automatic scaling of compute resources (EC2,... |
| [aws-cloudformation](../../skills/aws-cloudformation/SKILL.md) | Cncf | "Creates Infrastructure as Code templates with... |
| [aws-cloudfront](../../skills/aws-cloudfront/SKILL.md) | Cncf | "Configures CloudFront CDN for global content distribution... |
| [aws-cloudwatch](../../skills/aws-cloudwatch/SKILL.md) | Cncf | "Configures CloudWatch monitoring with metrics, logs,... |
| [aws-dynamodb](../../skills/aws-dynamodb/SKILL.md) | Cncf | "Deploys managed NoSQL databases with DynamoDB for... |
| [aws-ec2](../../skills/aws-ec2/SKILL.md) | Cncf | "Deploys, configures, and auto-scales EC2 instances with... |
| [aws-ecr](../../skills/aws-ecr/SKILL.md) | Cncf | "Manages container image repositories with ECR for secure... |
| [aws-eks](../../skills/aws-eks/SKILL.md) | Cncf | "Deploys managed Kubernetes clusters with EKS for container... |
| [aws-elb](../../skills/aws-elb/SKILL.md) | Cncf | "Configures Elastic Load Balancing (ALB, NLB, Classic) for... |
| [aws-iam](../../skills/aws-iam/SKILL.md) | Cncf | "Configures identity and access management with IAM users,... |
| [aws-kms](../../skills/aws-kms/SKILL.md) | Cncf | "Manages encryption keys with AWS KMS for data protection... |
| [aws-lambda](../../skills/aws-lambda/SKILL.md) | Cncf | "Deploys serverless event-driven applications with Lambda... |
| [aws-rds](../../skills/aws-rds/SKILL.md) | Cncf | "Deploys managed relational databases (MySQL, PostgreSQL,... |
| [aws-route53](../../skills/aws-route53/SKILL.md) | Cncf | "Configures DNS routing with Route 53 for domain... |
| [aws-s3](../../skills/aws-s3/SKILL.md) | Cncf | "Configures S3 object storage with versioning, lifecycle... |
| [aws-secrets-manager](../../skills/aws-secrets-manager/SKILL.md) | Cncf | "Manages sensitive data with automatic encryption,... |
| [aws-sns](../../skills/aws-sns/SKILL.md) | Cncf | "Deploys managed pub/sub messaging with SNS for... |
| [aws-sqs](../../skills/aws-sqs/SKILL.md) | Cncf | "Deploys managed message queues with SQS for asynchronous... |
| [aws-ssm](../../skills/aws-ssm/SKILL.md) | Cncf | "Manages EC2 instances and on-premises servers with AWS... |
| [aws-vpc](../../skills/aws-vpc/SKILL.md) | Cncf | "Configures Virtual Private Clouds with subnets, route... |
| [azure-aks](../../skills/azure-aks/SKILL.md) | Cncf | "Provides Managed Kubernetes cluster with automatic scaling... |
| [azure-automation](../../skills/azure-automation/SKILL.md) | Cncf | Provides Automation and orchestration of Azure resources... |
| [azure-blob-storage](../../skills/azure-blob-storage/SKILL.md) | Cncf | Provides Object storage with versioning, lifecycle... |
| [azure-cdn](../../skills/azure-cdn/SKILL.md) | Cncf | Provides Content delivery network for caching and global... |
| [azure-container-registry](../../skills/azure-container-registry/SKILL.md) | Cncf | "Provides Stores and manages container images with... |
| [azure-cosmos-db](../../skills/azure-cosmos-db/SKILL.md) | Cncf | Provides Global NoSQL database with multi-region... |
| [azure-event-hubs](../../skills/azure-event-hubs/SKILL.md) | Cncf | "Provides Event streaming platform for high-throughput data... |
| [azure-functions](../../skills/azure-functions/SKILL.md) | Cncf | Provides Serverless computing with event-driven functions... |
| [azure-key-vault](../../skills/azure-key-vault/SKILL.md) | Cncf | "Manages encryption keys, secrets, and certificates with... |
| [azure-keyvault-secrets](../../skills/azure-keyvault-secrets/SKILL.md) | Cncf | "Provides Secret management and rotation for sensitive... |
| [azure-load-balancer](../../skills/azure-load-balancer/SKILL.md) | Cncf | Provides Distributes traffic across VMs with health probes... |
| [azure-monitor](../../skills/azure-monitor/SKILL.md) | Cncf | "Provides Monitoring and logging for Azure resources with... |
| [azure-rbac](../../skills/azure-rbac/SKILL.md) | Cncf | "Manages identity and access with roles, service... |
| [azure-resource-manager](../../skills/azure-resource-manager/SKILL.md) | Cncf | "Provides Infrastructure as code using ARM templates for... |
| [azure-scale-sets](../../skills/azure-scale-sets/SKILL.md) | Cncf | "Manages auto-scaling VM groups with load balancing and... |
| [azure-service-bus](../../skills/azure-service-bus/SKILL.md) | Cncf | "Provides Messaging service with queues and topics for... |
| [azure-sql-database](../../skills/azure-sql-database/SKILL.md) | Cncf | Provides Managed relational database with elastic pools,... |
| [azure-traffic-manager](../../skills/azure-traffic-manager/SKILL.md) | Cncf | Provides DNS-based traffic routing with health checks and... |
| [azure-virtual-machines](../../skills/azure-virtual-machines/SKILL.md) | Cncf | "Deploys and manages VMs with auto-scaling, availability... |
| [azure-virtual-networks](../../skills/azure-virtual-networks/SKILL.md) | Cncf | "Provides Networking with subnets, network security groups,... |
| [backstage](../../skills/backstage/SKILL.md) | Cncf | "Provides Backstage in Cloud-Native Engineering - Developer... |
| [buildpacks](../../skills/buildpacks/SKILL.md) | Cncf | "Provides Buildpacks in Cloud-Native Engineering - Turn... |
| [calico](../../skills/calico/SKILL.md) | Cncf | "Calico in Cloud Native Security - cloud native... |
| [cert-manager](../../skills/cert-manager/SKILL.md) | Cncf | "cert-manager in Cloud-Native Engineering - Certificate... |
| [chaosmesh](../../skills/chaosmesh/SKILL.md) | Cncf | ''Provides Chaos Mesh in Cloud-Native Engineering... |
| [cilium](../../skills/cilium/SKILL.md) | Cncf | "Cilium in Cloud Native Network - cloud native... |
| [cloud-custodian](../../skills/cloud-custodian/SKILL.md) | Cncf | "Provides Cloud Custodian in Cloud-Native Engineering... |
| [cloudevents](../../skills/cloudevents/SKILL.md) | Cncf | "CloudEvents in Streaming & Messaging - cloud native... |
| [cni](../../skills/cni/SKILL.md) | Cncf | "Cni in Cloud-Native Engineering - Container Network... |
| [container-network-interface-cni](../../skills/container-network-interface-cni/SKILL.md) | Cncf | "Container Network Interface in Cloud Native Network -... |
| [containerd](../../skills/containerd/SKILL.md) | Cncf | "Containerd in Cloud-Native Engineering - An open and... |
| [contour](../../skills/contour/SKILL.md) | Cncf | "Contour in Service Proxy - cloud native architecture,... |
| [coredns](../../skills/coredns/SKILL.md) | Cncf | "Coredns in Cloud-Native Engineering - CoreDNS is a DNS... |
| [cortex](../../skills/cortex/SKILL.md) | Cncf | "Cortex in Monitoring & Observability - distributed,... |
| [cri-o](../../skills/cri-o/SKILL.md) | Cncf | "Provides CRI-O in Container Runtime - OCI-compliant... |
| [crossplane](../../skills/crossplane/SKILL.md) | Cncf | "Crossplane in Platform Engineering - Kubernetes-native... |
| [cubefs](../../skills/cubefs/SKILL.md) | Cncf | "Provides CubeFS in Storage - distributed, high-performance... |
| [dapr](../../skills/dapr/SKILL.md) | Cncf | "Provides Dapr in Cloud-Native Engineering - distributed... |
| [dragonfly](../../skills/dragonfly/SKILL.md) | Cncf | "Provides Dragonfly in Cloud-Native Engineering - P2P file... |
| [emissary-ingress](../../skills/emissary-ingress/SKILL.md) | Cncf | "Provides Emissary-Ingress in Cloud-Native Engineering -... |
| [envoy](../../skills/envoy/SKILL.md) | Cncf | "Envoy in Cloud-Native Engineering - Cloud-native... |
| [etcd](../../skills/etcd/SKILL.md) | Cncf | "Provides etcd in Cloud-Native Engineering - distributed... |
| [falco](../../skills/falco/SKILL.md) | Cncf | "Provides Falco in Cloud-Native Engineering - Cloud Native... |
| [flatcar-container-linux](../../skills/flatcar-container-linux/SKILL.md) | Cncf | "Provides Flatcar Container Linux in Cloud-Native... |
| [fluentd](../../skills/fluentd/SKILL.md) | Cncf | "Fluentd unified logging layer for collecting,... |
| [fluid](../../skills/fluid/SKILL.md) | Cncf | "Fluid in A Kubernetes-native data acceleration layer for... |
| [flux](../../skills/flux/SKILL.md) | Cncf | "Configures flux in cloud-native engineering - gitops for... |
| [gcp-autoscaling](../../skills/gcp-autoscaling/SKILL.md) | Cncf | "Provides Automatically scales compute resources based on... |
| [gcp-cloud-cdn](../../skills/gcp-cloud-cdn/SKILL.md) | Cncf | Provides Content delivery network for caching and globally... |
| [gcp-cloud-dns](../../skills/gcp-cloud-dns/SKILL.md) | Cncf | Manages DNS with health checks, traffic routing, and... |
| [gcp-cloud-functions](../../skills/gcp-cloud-functions/SKILL.md) | Cncf | Deploys serverless functions triggered by events with... |
| [gcp-cloud-kms](../../skills/gcp-cloud-kms/SKILL.md) | Cncf | "Manages encryption keys for data protection with automated... |
| [gcp-cloud-load-balancing](../../skills/gcp-cloud-load-balancing/SKILL.md) | Cncf | "Provides Distributes traffic across instances with... |
| [gcp-cloud-monitoring](../../skills/gcp-cloud-monitoring/SKILL.md) | Cncf | "Monitors GCP resources with metrics, logging, and alerting... |
| [gcp-cloud-operations](../../skills/gcp-cloud-operations/SKILL.md) | Cncf | "Provides Systems management including monitoring, logging,... |
| [gcp-cloud-pubsub](../../skills/gcp-cloud-pubsub/SKILL.md) | Cncf | "Asynchronous messaging service for event streaming and... |
| [gcp-cloud-sql](../../skills/gcp-cloud-sql/SKILL.md) | Cncf | "Provides managed relational databases (MySQL, PostgreSQL)... |
| [gcp-cloud-storage](../../skills/gcp-cloud-storage/SKILL.md) | Cncf | "Provides Stores objects with versioning, lifecycle... |
| [gcp-cloud-tasks](../../skills/gcp-cloud-tasks/SKILL.md) | Cncf | "Manages task queues for asynchronous job execution with... |
| [gcp-compute-engine](../../skills/gcp-compute-engine/SKILL.md) | Cncf | "Deploys and manages virtual machine instances with... |
| [gcp-container-registry](../../skills/gcp-container-registry/SKILL.md) | Cncf | "Provides Stores and manages container images with... |
| [gcp-deployment-manager](../../skills/gcp-deployment-manager/SKILL.md) | Cncf | "Infrastructure as code using YAML templates for repeatable... |
| [gcp-firestore](../../skills/gcp-firestore/SKILL.md) | Cncf | Provides NoSQL document database with real-time sync,... |
| [gcp-gke](../../skills/gcp-gke/SKILL.md) | Cncf | "Provides Managed Kubernetes cluster with automatic... |
| [gcp-iam](../../skills/gcp-iam/SKILL.md) | Cncf | "Manages identity and access control with service accounts,... |
| [gcp-secret-manager](../../skills/gcp-secret-manager/SKILL.md) | Cncf | "Provides Stores and rotates secrets with encryption and... |
| [gcp-vpc](../../skills/gcp-vpc/SKILL.md) | Cncf | "Provides networking with subnets, firewall rules, and VPC... |
| [git-advanced](../../skills/git-advanced/SKILL.md) | Coding | "Provides Advanced Git operations including rebasing,... |
| [grpc](../../skills/grpc/SKILL.md) | Cncf | "gRPC in Remote Procedure Call - cloud native architecture,... |
| [harbor](../../skills/harbor/SKILL.md) | Cncf | "Configures harbor in cloud-native engineering - container... |
| [helm](../../skills/helm/SKILL.md) | Cncf | "Provides Helm in Cloud-Native Engineering - The Kubernetes... |
| [in-toto](../../skills/in-toto/SKILL.md) | Cncf | "in-toto in Supply Chain Security - cloud native... |
| [istio](../../skills/istio/SKILL.md) | Cncf | "Istio in Cloud-Native Engineering - Connect, secure,... |
| [jaeger](../../skills/jaeger/SKILL.md) | Cncf | "Configures jaeger in cloud-native engineering -... |
| [karmada](../../skills/karmada/SKILL.md) | Cncf | "Provides Karmada in Cloud-Native Engineering -... |
| [keda](../../skills/keda/SKILL.md) | Cncf | "Configures keda in cloud-native engineering - event-driven... |
| [keycloak](../../skills/keycloak/SKILL.md) | Cncf | "Provides Keycloak in Cloud-Native Engineering - identity... |
| [knative](../../skills/knative/SKILL.md) | Cncf | "Provides Knative in Cloud-Native Engineering - serverless... |
| [kong](../../skills/kong/SKILL.md) | Cncf | "Kong in API Gateway - cloud native architecture, patterns,... |
| [kong-ingress-controller](../../skills/kong-ingress-controller/SKILL.md) | Cncf | "Kong Ingress Controller in Kubernetes - cloud native... |
| [krustlet](../../skills/krustlet/SKILL.md) | Cncf | "Krustlet in Kubernetes Runtime - cloud native... |
| [kserve](../../skills/kserve/SKILL.md) | Cncf | "Configures kserve in cloud-native engineering - model... |
| [kubeedge](../../skills/kubeedge/SKILL.md) | Cncf | "Configures kubeedge in cloud-native engineering - edge... |
| [kubeflow](../../skills/kubeflow/SKILL.md) | Cncf | "Configures kubeflow in cloud-native engineering - ml on... |
| [kubernetes](../../skills/kubernetes/SKILL.md) | Cncf | "Kubernetes in Cloud-Native Engineering - Production-Grade... |
| [kubescape](../../skills/kubescape/SKILL.md) | Cncf | "Configures kubescape in cloud-native engineering -... |
| [kubevela](../../skills/kubevela/SKILL.md) | Cncf | "Configures kubevela in cloud-native engineering -... |
| [kubevirt](../../skills/kubevirt/SKILL.md) | Cncf | "Provides KubeVirt in Cloud-Native Engineering -... |
| [kuma](../../skills/kuma/SKILL.md) | Cncf | "Kuma in Service Mesh - cloud native architecture,... |
| [kyverno](../../skills/kyverno/SKILL.md) | Cncf | "Configures kyverno in cloud-native engineering - policy... |
| [lima](../../skills/lima/SKILL.md) | Cncf | "Lima in Container Runtime - cloud native architecture,... |
| [linkerd](../../skills/linkerd/SKILL.md) | Cncf | "Linkerd in Service Mesh - cloud native architecture,... |
| [litmus](../../skills/litmus/SKILL.md) | Cncf | "Litmus in Chaos Engineering - cloud native architecture,... |
| [longhorn](../../skills/longhorn/SKILL.md) | Cncf | "Longhorn in Cloud Native Storage - cloud native... |
| [metal3-io](../../skills/metal3-io/SKILL.md) | Cncf | "metal3.io in Bare Metal Provisioning - cloud native... |
| [nats](../../skills/nats/SKILL.md) | Cncf | "NATS in Cloud Native Messaging - cloud native... |
| [networking-osi](../../skills/networking-osi/SKILL.md) | Cncf | "OSI Model Networking for Cloud-Native - All 7 layers with... |
| [notary-project](../../skills/notary-project/SKILL.md) | Cncf | "Notary Project in Content Trust &amp; Security - cloud... |
| [oathkeeper](../../skills/oathkeeper/SKILL.md) | Cncf | "Oathkeeper in Identity & Access - cloud native... |
| [open-policy-agent-opa](../../skills/open-policy-agent-opa/SKILL.md) | Cncf | "Open Policy Agent in Security &amp; Compliance - cloud... |
| [open-telemetry](../../skills/open-telemetry/SKILL.md) | Cncf | "OpenTelemetry in Observability - cloud native... |
| [opencost](../../skills/opencost/SKILL.md) | Cncf | "OpenCost in Kubernetes Cost Monitoring - cloud native... |
| [openfeature](../../skills/openfeature/SKILL.md) | Cncf | "OpenFeature in Feature Flagging - cloud native... |
| [openfga](../../skills/openfga/SKILL.md) | Cncf | "OpenFGA in Security &amp; Compliance - cloud native... |
| [openkruise](../../skills/openkruise/SKILL.md) | Cncf | "OpenKruise in Extended Kubernetes workload management with... |
| [opentelemetry](../../skills/opentelemetry/SKILL.md) | Cncf | "OpenTelemetry in Observability framework for tracing,... |
| [openyurt](../../skills/openyurt/SKILL.md) | Cncf | ''Provides OpenYurt in Extending Kubernetes to edge... |
| [operator-framework](../../skills/operator-framework/SKILL.md) | Cncf | "Operator Framework in Tools to build and manage Kubernetes... |
| [ory-hydra](../../skills/ory-hydra/SKILL.md) | Cncf | "ORY Hydra in Security & Compliance - cloud native... |
| [ory-kratos](../../skills/ory-kratos/SKILL.md) | Cncf | "ORY Kratos in Identity & Access - cloud native... |
| [process-architecture](../../skills/process-architecture/SKILL.md) | Cncf | "Creates or updates ARCHITECTURE.md documenting the... |
| [process-incident-response](../../skills/process-incident-response/SKILL.md) | Cncf | "Creates or updates an incident response plan covering... |
| [process-releases](../../skills/process-releases/SKILL.md) | Cncf | "Creates or updates RELEASES.md documenting the release... |
| [process-security-policy](../../skills/process-security-policy/SKILL.md) | Cncf | "Creates or updates SECURITY.md defining the vulnerability... |
| [prometheus](../../skills/prometheus/SKILL.md) | Cncf | "Prometheus in Cloud-Native Engineering - The Prometheus... |
| [rook](../../skills/rook/SKILL.md) | Cncf | "Configures rook in cloud-native storage orchestration for... |
| [spiffe](../../skills/spiffe/SKILL.md) | Cncf | "Provides SPIFFE in Secure Product Identity Framework for... |
| [spire](../../skills/spire/SKILL.md) | Cncf | "Configures spire in spiffe implementation for real-world... |
| [state-management](../../skills/state-management/SKILL.md) | Programming | ''CRITICAL: Use for Robius state management patterns.... |
| [strimzi](../../skills/strimzi/SKILL.md) | Cncf | "Provides Strimzi in Kafka on Kubernetes - Apache Kafka for... |
| [tekton](../../skills/tekton/SKILL.md) | Cncf | "Provides Tekton in Cloud-Native Engineering - A... |
| [thanos](../../skills/thanos/SKILL.md) | Cncf | "Provides Thanos in High availability Prometheus solution... |
| [the-update-framework-tuf](../../skills/the-update-framework-tuf/SKILL.md) | Cncf | "The Update Framework (TUF) in Secure software update... |
| [tikv](../../skills/tikv/SKILL.md) | Cncf | "TiKV in Distributed transactional key-value database... |
| [vitess](../../skills/vitess/SKILL.md) | Cncf | "Provides Vitess in Database clustering system for... |
| [volcano](../../skills/volcano/SKILL.md) | Cncf | "Configures volcano in batch scheduling infrastructure for... |
| [wasmcloud](../../skills/wasmcloud/SKILL.md) | Cncf | "Provides wasmCloud in WebAssembly-based distributed... |
| [zot](../../skills/zot/SKILL.md) | Cncf | "Zot in Container Registry - cloud native architecture,... |


### Orchestration (Manage AI Agents) (68 skills)

| Skill Name | Domain | Description |
|---|---|---|
| [a-development-branch](../../skills/a-development-branch/SKILL.md) | Agent | "Provides use when implementation is complete, all tests... |
| [actions-templates](../../skills/actions-templates/SKILL.md) | Agent | "Provides Production-ready GitHub Actions workflow patterns... |
| [add-new-skill](../../skills/add-new-skill/SKILL.md) | Agent | "'Step-by-step guide for adding a new skill to the... |
| [advanced-workflows](../../skills/advanced-workflows/SKILL.md) | Agent | "Provides Master advanced Git techniques to maintain clean... |
| [agent-task-orchestrator](../../skills/agent-task-orchestrator/SKILL.md) | Agent | "Provides Route tasks to specialized AI agents with... |
| [and-validate](../../skills/and-validate/SKILL.md) | Agent | 'Provides MANDATORY: Run appropriate validation tools after... |
| [automation](../../skills/automation/SKILL.md) | Agent | "Provides Automate Bitbucket repositories, pull requests,... |
| [automation](../../skills/automation/SKILL.md) | Agent | "Provides Automate changelog generation from commits, PRs,... |
| [automation](../../skills/automation/SKILL.md) | Agent | "Provides Automate GitHub repositories, issues, pull... |
| [automation](../../skills/automation/SKILL.md) | Agent | "Provides Automate GitLab project management, issues, merge... |
| [automation](../../skills/automation/SKILL.md) | Agent | Provides Workflow automation is the infrastructure that... |
| [before-completion](../../skills/before-completion/SKILL.md) | Agent | "Provides Claiming work is complete without verification is... |
| [blueprint](../../skills/blueprint/SKILL.md) | Agent | "Provides Turn a one-line objective into a step-by-step... |
| [branch](../../skills/branch/SKILL.md) | Agent | "Provides Create a git branch following Sentry naming... |
| [build](../../skills/build/SKILL.md) | Agent | "Implements build for orchestration and agent coordination... |
| [ci-patterns](../../skills/ci-patterns/SKILL.md) | Agent | "Provides Comprehensive GitLab CI/CD pipeline patterns for... |
| [code-review](../../skills/code-review/SKILL.md) | Agent | "Provides Code review requires technical evaluation, not... |
| [code-review](../../skills/code-review/SKILL.md) | Agent | "Provides use when completing tasks, implementing major... |
| [commit](../../skills/commit/SKILL.md) | Agent | "Provides ALWAYS use this skill when committing code... |
| [confidence-based-selector](../../skills/confidence-based-selector/SKILL.md) | Agent | "Selects and executes the most appropriate skill based on... |
| [dag-patterns](../../skills/dag-patterns/SKILL.md) | Agent | Provides Build production Apache Airflow DAGs with best... |
| [dependency-graph-builder](../../skills/dependency-graph-builder/SKILL.md) | Agent | "Builds and maintains dependency graphs for task execution,... |
| [dev](../../skills/dev/SKILL.md) | Agent | "Provides Trigger.dev expert for background jobs, AI... |
| [driven-development](../../skills/driven-development/SKILL.md) | Agent | "Provides use when executing implementation plans with... |
| [dynamic-replanner](../../skills/dynamic-replanner/SKILL.md) | Agent | "Dynamically adjusts execution plans based on real-time... |
| [github-comments](../../skills/github-comments/SKILL.md) | Agent | "Provides use when you need to address review or issue... |
| [goal-to-milestones](../../skills/goal-to-milestones/SKILL.md) | Agent | "Translates high-level goals into actionable milestones and... |
| [golang-pro](../../skills/golang-pro/SKILL.md) | Agent | "Provides use when building durable distributed systems... |
| [hooks-automation](../../skills/hooks-automation/SKILL.md) | Agent | "Provides Master Git hooks setup with Husky, lint-staged,... |
| [implement](../../skills/implement/SKILL.md) | Agent | "Provides Execute tasks from a track's implementation plan... |
| [inngest](../../skills/inngest/SKILL.md) | Agent | "Provides Inngest expert for serverless-first background... |
| [intelligence](../../skills/intelligence/SKILL.md) | Agent | "Provides Protocolo de Inteligência Pré-Tarefa — ativa... |
| [issue-gate](../../skills/issue-gate/SKILL.md) | Agent | "Provides use when starting a new implementation task and... |
| [issues](../../skills/issues/SKILL.md) | Agent | "Implements interact with github issues - create, list, and... |
| [loop-delivery](../../skills/loop-delivery/SKILL.md) | Agent | "Provides use when a coding task must be completed against... |
| [manage](../../skills/manage/SKILL.md) | Agent | 'Provides Manage track lifecycle: archive, restore, delete,... |
| [management](../../skills/management/SKILL.md) | Agent | "Provides use this skill when creating, managing, or... |
| [multi-skill-executor](../../skills/multi-skill-executor/SKILL.md) | Agent | "Orchestrates execution of multiple skill specifications in... |
| [new-track](../../skills/new-track/SKILL.md) | Agent | "Provides Create a new track with specification and phased... |
| [orchestration-patterns](../../skills/orchestration-patterns/SKILL.md) | Agent | "Provides Master workflow orchestration architecture with... |
| [orchestrator](../../skills/orchestrator/SKILL.md) | Agent | "Provides use when a coding task should be driven... |
| [parallel-skill-runner](../../skills/parallel-skill-runner/SKILL.md) | Agent | "Executes multiple skill specifications concurrently,... |
| [patterns](../../skills/patterns/SKILL.md) | Agent | "Provides use this skill when implementing tasks according... |
| [pipeline-workflow](../../skills/pipeline-workflow/SKILL.md) | Agent | "Provides Complete end-to-end MLOps pipeline orchestration... |
| [planning](../../skills/planning/SKILL.md) | Agent | "Provides use when a user asks for a plan for a coding... |
| [plans](../../skills/plans/SKILL.md) | Agent | "Provides use when you have a written implementation plan... |
| [plans](../../skills/plans/SKILL.md) | Agent | "Provides use when you have a spec or requirements for a... |
| [pr](../../skills/pr/SKILL.md) | Agent | "Provides Alias for sentry-skills:pr-writer. Use when users... |
| [pr](../../skills/pr/SKILL.md) | Agent | "Provides Iterate on a PR until CI passes. Use when you... |
| [pr-workflows-git-workflow](../../skills/pr-workflows-git-workflow/SKILL.md) | Agent | "Provides Orchestrate a comprehensive git workflow from... |
| [pr-workflows-onboard](../../skills/pr-workflows-onboard/SKILL.md) | Agent | "Provides You are an **expert onboarding specialist and... |
| [pr-workflows-pr-enhance](../../skills/pr-workflows-pr-enhance/SKILL.md) | Agent | "Provides You are a PR optimization expert specializing in... |
| [pushing](../../skills/pushing/SKILL.md) | Agent | "Provides Stage all changes, create a conventional commit,... |
| [python-pro](../../skills/python-pro/SKILL.md) | Agent | "Provides Master Temporal workflow orchestration with... |
| [qstash](../../skills/qstash/SKILL.md) | Agent | "Provides Upstash QStash expert for serverless message... |
| [questions-if-underspecified](../../skills/questions-if-underspecified/SKILL.md) | Agent | "Provides Clarify requirements before implementing. Use... |
| [revert](../../skills/revert/SKILL.md) | Agent | "Implements git-aware undo by logical work unit (track,... |
| [review-requests](../../skills/review-requests/SKILL.md) | Agent | "Provides Fetch unread GitHub notifications for open PRs... |
| [setup](../../skills/setup/SKILL.md) | Agent | "Provides Configure a Rails project to work with Conductor... |
| [stack-orchestration-full-stack-feature](../../skills/stack-orchestration-full-stack-feature/SKILL.md) | Agent | "Provides use when working with full stack orchestration... |
| [status](../../skills/status/SKILL.md) | Agent | "Implements display project status, active tracks, and next... |
| [task-decomposition-engine](../../skills/task-decomposition-engine/SKILL.md) | Agent | "Decomposes complex tasks into smaller, manageable subtasks... |
| [validator](../../skills/validator/SKILL.md) | Agent | "Validates Conductor project artifacts for completeness"... |
| [with-files](../../skills/with-files/SKILL.md) | Agent | 'Implements work like manus: use persistent markdown files... |
| [workflow-automation](../../skills/workflow-automation/SKILL.md) | Agent | "Provides Patterns for automating GitHub workflows with AI... |
| [workflows](../../skills/workflows/SKILL.md) | Agent | "Provides Orchestrate multiple Antigravity skills through... |
| [writer](../../skills/writer/SKILL.md) | Agent | "Provides Create pull requests following Sentry's... |
| [writing](../../skills/writing/SKILL.md) | Agent | "Provides Structured task planning with clear breakdowns,... |


### Review (Audit & Validate) (112 skills)

| Skill Name | Domain | Description |
|---|---|---|
| [101](../../skills/101/SKILL.md) | Coding | "Provides Configure and test common network services (HTTP,... |
| [agent-skills](../../skills/agent-skills/SKILL.md) | Coding | "Provides Production-grade test automation skills for 46... |
| [analysis](../../skills/analysis/SKILL.md) | Coding | "Provides Execute comprehensive network traffic analysis... |
| [analysis-patterns](../../skills/analysis-patterns/SKILL.md) | Coding | "Provides Comprehensive patterns and techniques for... |
| [analysis-patterns](../../skills/analysis-patterns/SKILL.md) | Coding | "Provides Apply STRIDE methodology to systematically... |
| [analyst](../../skills/analyst/SKILL.md) | Coding | "Provides Expert firmware analyst specializing in embedded... |
| [analyst](../../skills/analyst/SKILL.md) | Coding | "Provides Expert malware analyst specializing in defensive... |
| [audit](../../skills/audit/SKILL.md) | Coding | "Detects missing zeroization of sensitive data in source... |
| [auditor](../../skills/auditor/SKILL.md) | Coding | "Provides Expert security auditor specializing in... |
| [authentication](../../skills/authentication/SKILL.md) | Coding | "Provides Identify and exploit authentication and session... |
| [automation](../../skills/automation/SKILL.md) | Coding | Provides Browser automation powers web testing, scraping,... |
| [automator](../../skills/automator/SKILL.md) | Coding | Provides Master AI-powered test automation with modern... |
| [bluebook-builder](../../skills/bluebook-builder/SKILL.md) | Coding | "Provides Build a minimal but real security policy for... |
| [bob-craft](../../skills/bob-craft/SKILL.md) | Coding | "Provides use when performing code review, writing or... |
| [bugs](../../skills/bugs/SKILL.md) | Coding | "Provides Find bugs, security vulnerabilities, and code... |
| [by-design](../../skills/by-design/SKILL.md) | Coding | "Provides use when building apps that collect user data.... |
| [checklist](../../skills/checklist/SKILL.md) | Coding | "Provides Provide a comprehensive checklist for planning,... |
| [claude-skill](../../skills/claude-skill/SKILL.md) | Coding | "Implements web fuzzing with ffuf patterns for software... |
| [claude-skill](../../skills/claude-skill/SKILL.md) | Coding | "Provides Secure environment variable management ensuring... |
| [cleanup-tech-debt](../../skills/cleanup-tech-debt/SKILL.md) | Coding | "Provides You are a technical debt expert specializing in... |
| [code](../../skills/code/SKILL.md) | Coding | "Implements this skill embodies the principles of patterns... |
| [code-auditor](../../skills/code-auditor/SKILL.md) | Coding | "Provides Audit rapidly generated or AI-produced code for... |
| [code-review](../../skills/code-review/SKILL.md) | Coding | "Provides Human review workflow for AI-generated GitHub... |
| [commands](../../skills/commands/SKILL.md) | Coding | "Provides Provide a comprehensive command reference for... |
| [compliance](../../skills/compliance/SKILL.md) | Coding | "Provides Master PCI DSS (Payment Card Industry Data... |
| [compliance-checker](../../skills/compliance-checker/SKILL.md) | Coding | "Provides Automated compliance checking against CIS,... |
| [compliance-compliance-check](../../skills/compliance-compliance-check/SKILL.md) | Coding | "Provides You are a compliance expert specializing in... |
| [configuration](../../skills/configuration/SKILL.md) | Coding | "Provides Configure mutual TLS (mTLS) for zero-trust... |
| [configuration](../../skills/configuration/SKILL.md) | Coding | Provides Static Application Security Testing (SAST) tool... |
| [configuration](../../skills/configuration/SKILL.md) | Coding | "Provides Master ShellCheck static analysis configuration... |
| [data-handling](../../skills/data-handling/SKILL.md) | Coding | "Provides Practical implementation guide for GDPR-compliant... |
| [directory-attacks](../../skills/directory-attacks/SKILL.md) | Coding | "Provides Provide comprehensive techniques for attacking... |
| [e2e-testing](../../skills/e2e-testing/SKILL.md) | Coding | "Provides AI-powered E2E web testing — eyes and hands for... |
| [engineer](../../skills/engineer/SKILL.md) | Coding | "Provides Expert reverse engineer specializing in binary... |
| [escalation-methods](../../skills/escalation-methods/SKILL.md) | Coding | "Provides Provide comprehensive techniques for escalating... |
| [forensics](../../skills/forensics/SKILL.md) | Coding | "Provides Comprehensive techniques for acquiring,... |
| [framework](../../skills/framework/SKILL.md) | Coding | "Provides ⚠️ AUTHORIZED USE ONLY > This skill is for... |
| [hacking-methodology](../../skills/hacking-methodology/SKILL.md) | Coding | "Provides Master the complete penetration testing lifecycle... |
| [html-injection](../../skills/html-injection/SKILL.md) | Coding | "Provides Execute comprehensive client-side injection... |
| [iam-best-practices](../../skills/iam-best-practices/SKILL.md) | Coding | Provides IAM policy review, hardening, and least privilege... |
| [implementation-patterns](../../skills/implementation-patterns/SKILL.md) | Coding | "Provides Build secure, scalable authentication and... |
| [injection-testing](../../skills/injection-testing/SKILL.md) | Coding | Provides Identify and exploit HTML injection... |
| [injection-testing](../../skills/injection-testing/SKILL.md) | Coding | Provides Execute comprehensive SQL injection vulnerability... |
| [java](../../skills/java/SKILL.md) | Coding | Provides Scaffold, write, debug, and enhance... |
| [kaizen](../../skills/kaizen/SKILL.md) | Coding | "Provides Guide for continuous improvement, error proofing,... |
| [load-testing](../../skills/load-testing/SKILL.md) | Coding | "Provides Comprehensive k6 load testing skill for API,... |
| [management](../../skills/management/SKILL.md) | Coding | Provides Secure secrets management practices for CI/CD... |
| [management-deps-audit](../../skills/management-deps-audit/SKILL.md) | Coding | "Provides You are a dependency security expert specializing... |
| [mitigation-mapping](../../skills/mitigation-mapping/SKILL.md) | Coding | "Provides Map identified threats to appropriate security... |
| [modeling-expert](../../skills/modeling-expert/SKILL.md) | Coding | "Provides Expert in threat modeling methodologies, security... |
| [omega](../../skills/omega/SKILL.md) | Coding | "Provides CISO operacional enterprise para gestao total de... |
| [orchestrator](../../skills/orchestrator/SKILL.md) | Coding | "Provides Master TDD orchestrator specializing in... |
| [path-traversal](../../skills/path-traversal/SKILL.md) | Coding | "Provides Identify and exploit file path traversal... |
| [patterns](../../skills/patterns/SKILL.md) | Coding | "Provides Jest testing patterns, factory functions, mocking... |
| [penetration-testing](../../skills/penetration-testing/SKILL.md) | Coding | Provides Conduct comprehensive security assessments of SMTP... |
| [penetration-testing](../../skills/penetration-testing/SKILL.md) | Coding | Provides Conduct comprehensive SSH security assessments... |
| [penetration-testing](../../skills/penetration-testing/SKILL.md) | Coding | Provides Assess WordPress installations for common... |
| [playwright](../../skills/playwright/SKILL.md) | Coding | Provides Expert capability for robust, stealthy, and... |
| [privilege-escalation](../../skills/privilege-escalation/SKILL.md) | Coding | "Provides Execute systematic privilege escalation... |
| [privilege-escalation](../../skills/privilege-escalation/SKILL.md) | Coding | "Provides Provide systematic methodologies for discovering... |
| [project-parser](../../skills/project-parser/SKILL.md) | Coding | "Provides Searches and explores Burp Suite project files... |
| [python-testing](../../skills/python-testing/SKILL.md) | Coding | "Provides Comprehensive testing approaches for Temporal... |
| [reader-testing](../../skills/reader-testing/SKILL.md) | Coding | "Provides Practical guide to testing web applications with... |
| [reconnaissance](../../skills/reconnaissance/SKILL.md) | Coding | "Provides Provide systematic methodologies for leveraging... |
| [refactoring-refactor-clean](../../skills/refactoring-refactor-clean/SKILL.md) | Coding | Provides You are a code refactoring expert specializing in... |
| [requirement-extraction](../../skills/requirement-extraction/SKILL.md) | Coding | "Provides Derive security requirements from threat models... |
| [reverse-engineering](../../skills/reverse-engineering/SKILL.md) | Coding | "Provides Comprehensive techniques for capturing,... |
| [reversing-techniques](../../skills/reversing-techniques/SKILL.md) | Coding | 'Provides AUTHORIZED USE ONLY: This skill contains dual-use... |
| [review](../../skills/review/SKILL.md) | Coding | "Provides Professional code review with auto CHANGELOG... |
| [review](../../skills/review/SKILL.md) | Coding | "Implements security-focused code review for prs, commits,... |
| [review](../../skills/review/SKILL.md) | Coding | "Implements verify fix commits address audit findings... |
| [review-checklist](../../skills/review-checklist/SKILL.md) | Coding | "Provides Comprehensive checklist for conducting thorough... |
| [review-full-review](../../skills/review-full-review/SKILL.md) | Coding | "Implements use when working with comprehensive review full... |
| [review-pr-enhance](../../skills/review-pr-enhance/SKILL.md) | Coding | "Provides Generate structured PR descriptions from diffs,... |
| [rule-creator](../../skills/rule-creator/SKILL.md) | Coding | "Creates custom Semgrep rules for detecting security... |
| [rule-variant-creator](../../skills/rule-variant-creator/SKILL.md) | Coding | "Creates language variants of existing Semgrep rules. Use... |
| [scanner](../../skills/scanner/SKILL.md) | Coding | "Provides Advanced vulnerability analysis principles. OWASP... |
| [scanning-security-dependencies](../../skills/scanning-security-dependencies/SKILL.md) | Coding | "Provides You are a security expert specializing in... |
| [scanning-security-hardening](../../skills/scanning-security-hardening/SKILL.md) | Coding | "Provides Coordinate multi-layer security scanning and... |
| [scanning-security-sast](../../skills/scanning-security-sast/SKILL.md) | Coding | "Static Application Security Testing (SAST) for code... |
| [secrets-rotation](../../skills/secrets-rotation/SKILL.md) | Coding | "Provides Automate AWS secrets rotation for RDS, API keys,... |
| [security](../../skills/security/SKILL.md) | Coding | "Provides Master smart contract security best practices,... |
| [security-audit](../../skills/security-audit/SKILL.md) | Coding | "Provides Comprehensive AWS security posture assessment... |
| [security-audit](../../skills/security-audit/SKILL.md) | Coding | "Provides Security auditor for Laravel applications.... |
| [security-audit-007](../../skills/security-audit-007/SKILL.md) | Coding | "Provides Security audit, hardening, threat modeling... |
| [security-coder](../../skills/security-coder/SKILL.md) | Coding | "Provides Expert in secure frontend coding practices... |
| [security-review](../../skills/security-review/SKILL.md) | Coding | "Provides Find exploitable vulnerabilities in GitHub... |
| [skill](../../skills/skill/SKILL.md) | Coding | 'Provides IMPORTANT - Path Resolution: This skill can be... |
| [skill](../../skills/skill/SKILL.md) | Coding | "Implements pairwise test generation patterns for software... |
| [skills](../../skills/skills/SKILL.md) | Coding | "Provides Expert security auditor for AI Skills and... |
| [suite-testing](../../skills/suite-testing/SKILL.md) | Coding | Provides Execute comprehensive web application security... |
| [team-tactics](../../skills/team-tactics/SKILL.md) | Coding | "Provides Red team tactics principles based on MITRE... |
| [team-tools](../../skills/team-tools/SKILL.md) | Coding | "Provides Implement proven methodologies and tool workflows... |
| [testing](../../skills/testing/SKILL.md) | Coding | Provides Provide systematic methodologies for identifying... |
| [testing](../../skills/testing/SKILL.md) | Coding | Provides To test local web applications, write native... |
| [testing-patterns](../../skills/testing-patterns/SKILL.md) | Coding | "Provides Master Bash Automated Testing System (Bats) for... |
| [testing-patterns](../../skills/testing-patterns/SKILL.md) | Coding | Provides Build reliable, fast, and maintainable end-to-end... |
| [testing-test-generate](../../skills/testing-test-generate/SKILL.md) | Coding | "Provides Generate comprehensive, maintainable unit tests... |
| [time-analysis](../../skills/time-analysis/SKILL.md) | Coding | "Provides Analyze cryptographic code to detect operations... |
| [to-code-compliance](../../skills/to-code-compliance/SKILL.md) | Coding | "Provides Verifies code implements exactly what... |
| [tools](../../skills/tools/SKILL.md) | Coding | "Provides Master essential security scanning tools for... |
| [tree-construction](../../skills/tree-construction/SKILL.md) | Coding | "Provides Build comprehensive attack trees to visualize... |
| [ui-verification](../../skills/ui-verification/SKILL.md) | Coding | Provides Automated end-to-end UI testing and verification... |
| [uploads](../../skills/uploads/SKILL.md) | Coding | "Provides Expert at handling file uploads and cloud... |
| [varlock](../../skills/varlock/SKILL.md) | Coding | "Provides Secure-by-default environment variable management... |
| [web-fuzzing](../../skills/web-fuzzing/SKILL.md) | Coding | "Provides Expert guidance for ffuf web fuzzing during... |
| [web-vulnerabilities](../../skills/web-vulnerabilities/SKILL.md) | Coding | "Provides Provide a comprehensive, structured reference for... |
| [workflow](../../skills/workflow/SKILL.md) | Coding | "Provides Test-Driven Development workflow principles.... |
| [workflows-tdd-cycle](../../skills/workflows-tdd-cycle/SKILL.md) | Coding | "Implements use when working with tdd workflows tdd cycle... |
| [workflows-tdd-green](../../skills/workflows-tdd-green/SKILL.md) | Coding | "Provides Implement the minimal code needed to make failing... |
| [workflows-tdd-red](../../skills/workflows-tdd-red/SKILL.md) | Coding | "Provides Generate failing tests for the TDD red phase to... |
| [workflows-tdd-refactor](../../skills/workflows-tdd-refactor/SKILL.md) | Coding | "Implements use when working with tdd workflows tdd... |

## Complete Skills Index

| Skill Name | Domain | Description | Role |
|---|---|---|---|
| [101](../../skills/coding/101/SKILL.md) | Coding | "Provides Configure and test common network services (HTTP,... | Review |
| [3d-integration](../../skills/programming/3d-integration/SKILL.md) | Programming | "Provides use when adding interactive 3d scenes from... | Implementation |
| [a-development-branch](../../skills/agent/a-development-branch/SKILL.md) | Agent | "Provides use when implementation is complete, all tests... | Orchestration |
| [a11y](../../skills/programming/a11y/SKILL.md) | Programming | "Provides Audit a StyleSeed-based component or page for... | Implementation |
| [abl-v10-learning](../../skills/programming/abl-v10-learning/SKILL.md) | Programming | "Reference guide for Progress OpenEdge ABL 10.1A (2005) —... | Reference |
| [abl-v12-learning](../../skills/programming/abl-v12-learning/SKILL.md) | Programming | "Reference guide for Progress OpenEdge ABL 12.7 (2023) —... | Reference |
| [access-review](../../skills/coding/access-review/SKILL.md) | Coding | "Implements django-access-review patterns for software... | Implementation |
| [accessibility](../../skills/coding/accessibility/SKILL.md) | Coding | "Provides Audit and fix HTML accessibility issues including... | Implementation |
| [accounting-setup](../../skills/programming/accounting-setup/SKILL.md) | Programming | 'Provides Expert guide for configuring Odoo Accounting:... | Implementation |
| [actions-auditor](../../skills/programming/actions-auditor/SKILL.md) | Programming | Audits GitHub Actions workflows for security... | Implementation |
| [actions-templates](../../skills/agent/actions-templates/SKILL.md) | Agent | "Provides Production-ready GitHub Actions workflow patterns... | Orchestration |
| [activity-planner](../../skills/programming/activity-planner/SKILL.md) | Programming | "Provides Plan puzzle-based activities for classrooms,... | Implementation |
| [actor-development](../../skills/agent/actor-development/SKILL.md) | Agent | 'Provides Important: Before you begin, fill in the... | Implementation |
| [actorization](../../skills/agent/actorization/SKILL.md) | Agent | Provides Actorization converts existing software into... | Implementation |
| [add-new-skill](../../skills/agent/add-new-skill/SKILL.md) | Agent | "'Step-by-step guide for adding a new skill to the... | Orchestration |
| [adhx](../../skills/programming/adhx/SKILL.md) | Programming | Provides Fetch any X/Twitter post as clean LLM-friendly... | Implementation |
| [admin](../../skills/cncf/admin/SKILL.md) | Cncf | "Provides Expert database administrator specializing in... | Implementation |
| [ads](../../skills/programming/ads/SKILL.md) | Programming | "Provides You are an expert performance marketer with... | Implementation |
| [advanced-types](../../skills/coding/advanced-types/SKILL.md) | Coding | "Provides Comprehensive guidance for mastering TypeScript's... | Implementation |
| [advanced-workflows](../../skills/agent/advanced-workflows/SKILL.md) | Agent | "Provides Master advanced Git techniques to maintain clean... | Orchestration |
| [advisor](../../skills/agent/advisor/SKILL.md) | Agent | "Provides Conselho de especialistas — consulta multiplos... | Implementation |
| [advisor](../../skills/programming/advisor/SKILL.md) | Programming | Provides Draft privacy policies, terms of service,... | Implementation |
| [aeo-blog-writer](../../skills/programming/aeo-blog-writer/SKILL.md) | Programming | "Provides Writes long-form blog posts with TL;DR block,... | Implementation |
| [aeo-check](../../skills/coding/aeo-check/SKILL.md) | Coding | "Provides Score any MCP server, API, or CLI for... | Implementation |
| [aeo-content-cluster](../../skills/programming/aeo-content-cluster/SKILL.md) | Programming | "Builds a topical authority map with a pillar page,... | Implementation |
| [aeo-content-quality-auditor](../../skills/programming/aeo-content-quality-auditor/SKILL.md) | Programming | "Audits content for SEO and AEO performance with scored... | Implementation |
| [aeo-internal-linking](../../skills/programming/aeo-internal-linking/SKILL.md) | Programming | "Provides Maps internal link opportunities between pages... | Implementation |
| [aeo-keyword-research](../../skills/programming/aeo-keyword-research/SKILL.md) | Programming | "Provides Researches and prioritises SEO keywords with AEO... | Implementation |
| [aeo-landing-page-writer](../../skills/programming/aeo-landing-page-writer/SKILL.md) | Programming | "Provides Writes complete, structured landing pages... | Implementation |
| [aeo-meta-description-generator](../../skills/programming/aeo-meta-description-generator/SKILL.md) | Programming | "Provides Writes 3 title tag variants and 3 meta... | Implementation |
| [aeo-schema-generator](../../skills/programming/aeo-schema-generator/SKILL.md) | Programming | Generates valid JSON-LD structured data for 10 schema types... | Implementation |
| [agent](../../skills/programming/agent/SKILL.md) | Programming | Provides Agente de contexto para continuidade entre... | Implementation |
| [agent-brainstorming](../../skills/programming/agent-brainstorming/SKILL.md) | Programming | Provides Simulate a structured peer-review process using... | Implementation |
| [agent-development](../../skills/agent/agent-development/SKILL.md) | Agent | "Provides AI agent development workflow for building... | Implementation |
| [agent-memory](../../skills/agent/agent-memory/SKILL.md) | Agent | "Provides Scoped CLAUDE.md memory system that reduces... | Implementation |
| [agent-patterns](../../skills/agent/agent-patterns/SKILL.md) | Agent | Implements this skill should be used when the user asks to... | Implementation |
| [agent-patterns](../../skills/programming/agent-patterns/SKILL.md) | Programming | Provides Design patterns for building autonomous coding... | Implementation |
| [agent-skills](../../skills/coding/agent-skills/SKILL.md) | Coding | "Provides Production-grade test automation skills for 46... | Review |
| [agent-task-orchestrator](../../skills/agent/agent-task-orchestrator/SKILL.md) | Agent | "Provides Route tasks to specialized AI agents with... | Orchestration |
| [agentflow](../../skills/programming/agentflow/SKILL.md) | Programming | "Provides Orchestrate autonomous AI development pipelines... | Implementation |
| [agentfolio](../../skills/programming/agentfolio/SKILL.md) | Programming | Provides Skill for discovering and researching autonomous... | Implementation |
| [agentmail](../../skills/programming/agentmail/SKILL.md) | Programming | Provides Email infrastructure for AI agents. Create... | Implementation |
| [agentphone](../../skills/programming/agentphone/SKILL.md) | Programming | Provides Build AI phone agents with AgentPhone API. Use... | Implementation |
| [agents](../../skills/agent/agents/SKILL.md) | Agent | Provides Build background agents in sandboxed environments.... | Implementation |
| [agents](../../skills/agent/agents/SKILL.md) | Agent | Provides Multi-agent orchestration patterns. Use when... | Implementation |
| [agents](../../skills/programming/agents/SKILL.md) | Programming | Provides Autonomous agents are AI systems that can... | Implementation |
| [agents](../../skills/programming/agents/SKILL.md) | Programming | Provides Voice agents represent the frontier of AI... | Implementation |
| [agents-architect](../../skills/agent/agents-architect/SKILL.md) | Agent | Provides Expert in designing and building autonomous AI... | Implementation |
| [agents-dotnet](../../skills/agent/agents-dotnet/SKILL.md) | Agent | Provides Microsoft 365 Agents SDK for .NET. Build... | Implementation |
| [agents-py](../../skills/programming/agents-py/SKILL.md) | Programming | Provides Microsoft 365 Agents SDK for Python. Build... | Implementation |
| [agents-ts](../../skills/agent/agents-ts/SKILL.md) | Agent | Implements microsoft 365 agents sdk for typescript/node.js... | Implementation |
| [agents-v2-py](../../skills/agent/agents-v2-py/SKILL.md) | Agent | Provides Build hosted agents using Azure AI Projects SDK... | Implementation |
| [ai](../../skills/agent/ai/SKILL.md) | Agent | "Provides Build production-ready AI agents with PydanticAI... | Implementation |
| [ai](../../skills/cncf/ai/SKILL.md) | Cncf | "Provides Autonomous DevSecOps & FinOps Guardrails.... | Implementation |
| [ai](../../skills/programming/ai/SKILL.md) | Programming | "Provides Geracao de imagens via Stability AI (SD3.5,... | Implementation |
| [ai-agents-persistent-dotnet](../../skills/cncf/ai-agents-persistent-dotnet/SKILL.md) | Cncf | "Provides Azure AI Agents Persistent SDK for .NET.... | Implementation |
| [ai-agents-persistent-java](../../skills/cncf/ai-agents-persistent-java/SKILL.md) | Cncf | "Provides Azure AI Agents Persistent SDK for Java.... | Implementation |
| [ai-anomaly-detection](../../skills/trading/ai-anomaly-detection/SKILL.md) | Trading | "Provides Detect anomalous market behavior, outliers, and... | Implementation |
| [ai-anomalydetector-java](../../skills/cncf/ai-anomalydetector-java/SKILL.md) | Cncf | "Provides Build anomaly detection applications with Azure... | Implementation |
| [ai-contentsafety-java](../../skills/cncf/ai-contentsafety-java/SKILL.md) | Cncf | "Provides Build content moderation applications using the... | Implementation |
| [ai-contentsafety-py](../../skills/cncf/ai-contentsafety-py/SKILL.md) | Cncf | "Provides Azure AI Content Safety SDK for Python. Use for... | Implementation |
| [ai-contentsafety-ts](../../skills/cncf/ai-contentsafety-ts/SKILL.md) | Cncf | "Provides Analyze text and images for harmful content with... | Implementation |
| [ai-contentunderstanding-py](../../skills/cncf/ai-contentunderstanding-py/SKILL.md) | Cncf | "Provides Azure AI Content Understanding SDK for Python.... | Implementation |
| [ai-development](../../skills/agent/ai-development/SKILL.md) | Agent | "Provides Expert in building voice AI applications - from... | Implementation |
| [ai-document-intelligence-dotnet](../../skills/cncf/ai-document-intelligence-dotnet/SKILL.md) | Cncf | Provides Azure AI Document Intelligence SDK for .NET.... | Implementation |
| [ai-document-intelligence-ts](../../skills/cncf/ai-document-intelligence-ts/SKILL.md) | Cncf | Provides Extract text, tables, and structured data from... | Implementation |
| [ai-engine-development](../../skills/programming/ai-engine-development/SKILL.md) | Programming | Provides Build real-time conversational AI voice engines... | Implementation |
| [ai-explainable-ai](../../skills/trading/ai-explainable-ai/SKILL.md) | Trading | "Provides Explainable AI for understanding and trusting... | Implementation |
| [ai-feature-engineering](../../skills/trading/ai-feature-engineering/SKILL.md) | Trading | "Implements create actionable trading features from raw... | Implementation |
| [ai-formrecognizer-java](../../skills/cncf/ai-formrecognizer-java/SKILL.md) | Cncf | "Provides Build document analysis applications using the... | Implementation |
| [ai-hyperparameter-tuning](../../skills/trading/ai-hyperparameter-tuning/SKILL.md) | Trading | "Implements optimize model configurations for trading... | Implementation |
| [ai-live-model-monitoring](../../skills/trading/ai-live-model-monitoring/SKILL.md) | Trading | "Provides Monitor production ML models for drift, decay,... | Implementation |
| [ai-llm-orchestration](../../skills/trading/ai-llm-orchestration/SKILL.md) | Trading | "Large Language Model orchestration for trading analysis... | Implementation |
| [ai-ml-py](../../skills/cncf/ai-ml-py/SKILL.md) | Cncf | Provides Azure Machine Learning SDK v2 for Python. Use for... | Implementation |
| [ai-model-ensemble](../../skills/trading/ai-model-ensemble/SKILL.md) | Trading | "Provides Combine multiple models for improved prediction... | Implementation |
| [ai-multi-asset-model](../../skills/trading/ai-multi-asset-model/SKILL.md) | Trading | "Provides Model inter-asset relationships for portfolio and... | Implementation |
| [ai-news-embedding](../../skills/trading/ai-news-embedding/SKILL.md) | Trading | "Implements process news text using nlp embeddings for... | Implementation |
| [ai-openai-dotnet](../../skills/cncf/ai-openai-dotnet/SKILL.md) | Cncf | "Provides Azure OpenAI SDK for .NET. Client library for... | Implementation |
| [ai-order-flow-analysis](../../skills/trading/ai-order-flow-analysis/SKILL.md) | Trading | "Provides Analyze order flow to detect market pressure and... | Implementation |
| [ai-projects-dotnet](../../skills/cncf/ai-projects-dotnet/SKILL.md) | Cncf | "Provides Azure AI Projects SDK for .NET. High-level client... | Implementation |
| [ai-projects-java](../../skills/cncf/ai-projects-java/SKILL.md) | Cncf | Provides Azure AI Projects SDK for Java. High-level SDK for... | Implementation |
| [ai-projects-py](../../skills/cncf/ai-projects-py/SKILL.md) | Cncf | "Provides Build AI applications on Microsoft Foundry using... | Implementation |
| [ai-projects-ts](../../skills/cncf/ai-projects-ts/SKILL.md) | Cncf | "Provides High-level SDK for Azure AI Foundry projects with... | Implementation |
| [ai-regime-classification](../../skills/trading/ai-regime-classification/SKILL.md) | Trading | "Provides Detect current market regime for adaptive trading... | Implementation |
| [ai-reinforcement-learning](../../skills/trading/ai-reinforcement-learning/SKILL.md) | Trading | "Provides Reinforcement Learning for automated trading... | Implementation |
| [ai-sdk-expert](../../skills/programming/ai-sdk-expert/SKILL.md) | Programming | "Provides Expert in the Vercel AI SDK. Covers Core API... | Implementation |
| [ai-sentiment-analysis](../../skills/trading/ai-sentiment-analysis/SKILL.md) | Trading | "AI-powered sentiment analysis for news, social media, and... | Implementation |
| [ai-sentiment-features](../../skills/trading/ai-sentiment-features/SKILL.md) | Trading | "Provides Extract market sentiment from news, social media,... | Implementation |
| [ai-synthetic-data](../../skills/trading/ai-synthetic-data/SKILL.md) | Trading | "Provides Generate synthetic financial data for training... | Implementation |
| [ai-textanalytics-py](../../skills/cncf/ai-textanalytics-py/SKILL.md) | Cncf | "Provides Azure AI Text Analytics SDK for sentiment... | Implementation |
| [ai-time-series-forecasting](../../skills/trading/ai-time-series-forecasting/SKILL.md) | Trading | "Provides Time series forecasting for price prediction and... | Implementation |
| [ai-transcription-py](../../skills/cncf/ai-transcription-py/SKILL.md) | Cncf | "Provides Azure AI Transcription SDK for Python. Use for... | Implementation |
| [ai-translation-document-py](../../skills/cncf/ai-translation-document-py/SKILL.md) | Cncf | "Provides Azure AI Document Translation SDK for batch... | Implementation |
| [ai-translation-text-py](../../skills/cncf/ai-translation-text-py/SKILL.md) | Cncf | "Provides Azure AI Text Translation SDK for real-time text... | Implementation |
| [ai-translation-ts](../../skills/cncf/ai-translation-ts/SKILL.md) | Cncf | "Configures text and document translation with rest-style... | Implementation |
| [ai-vision-imageanalysis-java](../../skills/cncf/ai-vision-imageanalysis-java/SKILL.md) | Cncf | "Provides Build image analysis applications with Azure AI... | Implementation |
| [ai-vision-imageanalysis-py](../../skills/cncf/ai-vision-imageanalysis-py/SKILL.md) | Cncf | "Provides Azure AI Vision Image Analysis SDK for captions,... | Implementation |
| [ai-voicelive-dotnet](../../skills/cncf/ai-voicelive-dotnet/SKILL.md) | Cncf | "Provides Azure AI Voice Live SDK for .NET. Build real-time... | Implementation |
| [ai-voicelive-java](../../skills/cncf/ai-voicelive-java/SKILL.md) | Cncf | "Provides Azure AI VoiceLive SDK for Java. Real-time... | Implementation |
| [ai-voicelive-py](../../skills/cncf/ai-voicelive-py/SKILL.md) | Cncf | "Provides Build real-time voice AI applications with... | Implementation |
| [ai-voicelive-ts](../../skills/cncf/ai-voicelive-ts/SKILL.md) | Cncf | "Provides Azure AI Voice Live SDK for... | Implementation |
| [ai-volatility-prediction](../../skills/trading/ai-volatility-prediction/SKILL.md) | Trading | "Implements forecast volatility for risk management and... | Implementation |
| [ai-writing](../../skills/programming/ai-writing/SKILL.md) | Programming | "Provides Audit and rewrite content to remove 21 categories... | Implementation |
| [alexa](../../skills/cncf/alexa/SKILL.md) | Cncf | "Provides Integracao completa com Amazon Alexa para criar... | Implementation |
| [algorithms](../../skills/programming/algorithms/SKILL.md) | Programming | ''Provides Comprehensive algorithm selection guide u2014... | Reference |
| [ally-health](../../skills/programming/ally-health/SKILL.md) | Programming | Provides a health assistant skill for medical information... | Implementation |
| [alternatives](../../skills/programming/alternatives/SKILL.md) | Programming | "Provides You are an expert in creating competitor... | Implementation |
| [altman](../../skills/programming/altman/SKILL.md) | Programming | "Provides Agente que simula Sam Altman — CEO da OpenAI,... | Implementation |
| [analysis](../../skills/coding/analysis/SKILL.md) | Coding | "Provides Execute comprehensive network traffic analysis... | Review |
| [analysis](../../skills/programming/analysis/SKILL.md) | Programming | "Provides Find similar vulnerabilities and bugs across... | Implementation |
| [analysis-patterns](../../skills/coding/analysis-patterns/SKILL.md) | Coding | "Provides Comprehensive patterns and techniques for... | Review |
| [analysis-patterns](../../skills/coding/analysis-patterns/SKILL.md) | Coding | "Provides Apply STRIDE methodology to systematically... | Review |
| [analyst](../../skills/coding/analyst/SKILL.md) | Coding | "Provides Expert firmware analyst specializing in embedded... | Review |
| [analyst](../../skills/coding/analyst/SKILL.md) | Coding | "Provides Expert malware analyst specializing in defensive... | Review |
| [analyst](../../skills/programming/analyst/SKILL.md) | Programming | Provides Master modern business analysis with AI-powered... | Implementation |
| [analyst](../../skills/programming/analyst/SKILL.md) | Programming | "Provides Build financial models, backtest trading... | Implementation |
| [analyst](../../skills/programming/analyst/SKILL.md) | Programming | "Provides Expert startup business analyst specializing in... | Implementation |
| [analytics-automation](../../skills/agent/analytics-automation/SKILL.md) | Agent | 'Provides Automate Google Analytics tasks via Rube MCP... | Implementation |
| [analyzer](../../skills/programming/analyzer/SKILL.md) | Programming | "Provides AI驱动的综合健康分析系 统，整合多维度健康数据、识别 异常模式、预测健康风险、提供... | Implementation |
| [analyzer](../../skills/programming/analyzer/SKILL.md) | Programming | "Provides 分析运动数据、识别运 动模式、评估健身进展，并提供 个性化训练建议。支持与慢性病 数据的关联分析。... | Implementation |
| [analyzer](../../skills/programming/analyzer/SKILL.md) | Programming | "Provides 分析健康目标数据、识 别目标模式、评估目标进度,并提 供个性化目标管理建议。支持与... | Implementation |
| [analyzer](../../skills/programming/analyzer/SKILL.md) | Programming | "Provides 分析营养数据、识别营 养模式、评估营养状况，并提供 个性化营养建议。支持与运动、... | Implementation |
| [analyzer](../../skills/programming/analyzer/SKILL.md) | Programming | "Provides 分析康复训练数据、识 别康复模式、评估康复进展，并 提供个性化康复建议 functionality... | Implementation |
| [analyzer](../../skills/programming/analyzer/SKILL.md) | Programming | "Provides 分析睡眠数据、识别睡 眠模式、评估睡眠质量，并提供 个性化睡眠改善建议。支持与其... | Implementation |
| [analyzer](../../skills/programming/analyzer/SKILL.md) | Programming | "Provides 分析减肥数据、计算代 谢率、追踪能量缺口、管理减肥 阶段 functionality and... | Implementation |
| [and-analyze-video](../../skills/programming/and-analyze-video/SKILL.md) | Programming | Provides Seek and analyze video content using Memories.ai... | Implementation |
| [and-validate](../../skills/agent/and-validate/SKILL.md) | Agent | 'Provides MANDATORY: Run appropriate validation tools after... | Orchestration |
| [andruia-consultant](../../skills/agent/andruia-consultant/SKILL.md) | Agent | "Provides Arquitecto de Soluciones Principal y Consultor... | Implementation |
| [andruia-niche-intelligence](../../skills/agent/andruia-niche-intelligence/SKILL.md) | Agent | "Provides Estratega de Inteligencia de Dominio de Andru.ia.... | Implementation |
| [andruia-skill-smith](../../skills/agent/andruia-skill-smith/SKILL.md) | Agent | "Provides Ingeniero de Sistemas de Andru.ia. Diseña,... | Implementation |
| [angular](../../skills/programming/angular/SKILL.md) | Programming | "Provides Modern Angular (v20+) expert with deep knowledge... | Implementation |
| [animation](../../skills/programming/animation/SKILL.md) | Programming | "Provides Advanced JavaScript animation library skill for... | Implementation |
| [animation](../../skills/programming/animation/SKILL.md) | Programming | "Provides Three.js animation - keyframe animation, skeletal... | Implementation |
| [animator](../../skills/programming/animator/SKILL.md) | Programming | "Provides AI-powered animation tool for creating motion in... | Implementation |
| [api](../../skills/programming/api/SKILL.md) | Programming | 'Provides Build apps with the Claude API or Anthropic SDK.... | Implementation |
| [api-dev](../../skills/programming/api-dev/SKILL.md) | Programming | 'Provides the gemini api provides access to google''s most... | Implementation |
| [api-integration](../../skills/agent/api-integration/SKILL.md) | Agent | Provides use when integrating google gemini api into... | Implementation |
| [api-integration-patterns](../../skills/coding/api-integration-patterns/SKILL.md) | Coding | "Provides Production-ready patterns for integrating... | Implementation |
| [api-routes](../../skills/programming/api-routes/SKILL.md) | Programming | "Provides Guidelines for creating API routes in Expo Router... | Implementation |
| [app-architecture](../../skills/programming/app-architecture/SKILL.md) | Programming | ''CRITICAL: Use for Robius app architecture patterns.... | Reference |
| [app-patterns](../../skills/programming/app-patterns/SKILL.md) | Programming | Provides Production-ready patterns for building LLM... | Implementation |
| [app-router-patterns](../../skills/coding/app-router-patterns/SKILL.md) | Coding | "Provides Comprehensive patterns for Next.js 14+ App Router... | Implementation |
| [appconfiguration-java](../../skills/cncf/appconfiguration-java/SKILL.md) | Cncf | "Provides Azure App Configuration SDK for Java. Centralized... | Implementation |
| [appconfiguration-py](../../skills/cncf/appconfiguration-py/SKILL.md) | Cncf | "Provides Azure App Configuration SDK for Python. Use for... | Implementation |
| [appconfiguration-ts](../../skills/cncf/appconfiguration-ts/SKILL.md) | Cncf | "Provides Centralized configuration management with feature... | Implementation |
| [appdeploy](../../skills/coding/appdeploy/SKILL.md) | Coding | "Provides Deploy web apps with backend APIs, database, and... | Implementation |
| [application-dev-ai-assistant](../../skills/programming/application-dev-ai-assistant/SKILL.md) | Programming | Provides You are an AI assistant development expert... | Implementation |
| [application-dev-langchain-agent](../../skills/programming/application-dev-langchain-agent/SKILL.md) | Programming | Provides You are an expert LangChain agent developer... | Implementation |
| [application-dev-prompt-optimize](../../skills/programming/application-dev-prompt-optimize/SKILL.md) | Programming | Provides You are an expert prompt engineer specializing in... | Implementation |
| [apps](../../skills/cncf/apps/SKILL.md) | Cncf | "Provides Expert patterns for Shopify app development... | Implementation |
| [ar](../../skills/programming/ar/SKILL.md) | Programming | "Provides VR/AR development principles. Comfort,... | Implementation |
| [arc-designer](../../skills/programming/arc-designer/SKILL.md) | Programming | "Provides one sentence - what this skill does and when to... | Implementation |
| [architect](../../skills/cncf/architect/SKILL.md) | Cncf | "Provides Expert cloud architect specializing in... | Implementation |
| [architect](../../skills/cncf/architect/SKILL.md) | Cncf | Provides Expert database architect specializing in data... | Implementation |
| [architect](../../skills/cncf/architect/SKILL.md) | Cncf | Provides Expert Kubernetes architect specializing in... | Implementation |
| [architect](../../skills/coding/architect/SKILL.md) | Coding | "Provides Expert backend architect specializing in scalable... | Implementation |
| [architect](../../skills/coding/architect/SKILL.md) | Coding | "Creates comprehensive technical documentation from... | Implementation |
| [architect](../../skills/coding/architect/SKILL.md) | Coding | "Provides Master modern GraphQL with federation,... | Implementation |
| [architect](../../skills/programming/architect/SKILL.md) | Programming | "Provides Expert .NET backend architect specializing in C#,... | Implementation |
| [architect](../../skills/programming/architect/SKILL.md) | Programming | "Provides Expert in monorepo architecture, build systems,... | Implementation |
| [architect](../../skills/programming/architect/SKILL.md) | Programming | "Provides Complete toolkit for senior architect with modern... | Implementation |
| [architect](../../skills/programming/architect/SKILL.md) | Programming | "Provides You are a documentation architect that produces... | Implementation |
| [architectural-patterns](../../skills/coding/architectural-patterns/SKILL.md) | Coding | "Provides Software architecture patterns including MVC,... | Reference |
| [architecture](../../skills/coding/architecture/SKILL.md) | Coding | "Provides Architectural decision-making framework.... | Implementation |
| [architecture](../../skills/coding/architecture/SKILL.md) | Coding | "Provides Plan or restructure website hierarchy,... | Implementation |
| [architecture](../../skills/coding/architecture/SKILL.md) | Coding | "Provides Guide for quality focused software architecture.... | Implementation |
| [architecture](../../skills/programming/architecture/SKILL.md) | Programming | Provides Master the LangChain framework for building... | Implementation |
| [architecture-best-practices](../../skills/cncf/architecture-best-practices/SKILL.md) | Cncf | "Cloud Native Computing Foundation (CNCF) architecture best... | Reference |
| [architecture-c4-architecture](../../skills/coding/architecture-c4-architecture/SKILL.md) | Coding | "Provides Generate comprehensive C4 architecture... | Implementation |
| [architecture-review](../../skills/programming/architecture-review/SKILL.md) | Programming | "Provides Review Bitcoin Lightning Network protocol... | Implementation |
| [argo](../../skills/cncf/argo/SKILL.md) | Cncf | "Argo in Cloud-Native Engineering - Kubernetes-Native... | Reference |
| [art](../../skills/programming/art/SKILL.md) | Programming | "Provides Algorithmic philosophies are computational... | Implementation |
| [art](../../skills/programming/art/SKILL.md) | Programming | "Provides Game art principles. Visual style selection,... | Implementation |
| [article-publisher-skill](../../skills/programming/article-publisher-skill/SKILL.md) | Programming | "Provides publish articles to x/twitter functionality and... | Implementation |
| [artifact-hub](../../skills/cncf/artifact-hub/SKILL.md) | Cncf | "Provides Artifact Hub in Cloud-Native Engineering -... | Reference |
| [artifacts-builder](../../skills/programming/artifacts-builder/SKILL.md) | Programming | 'Provides To build powerful frontend claude.ai artifacts,... | Implementation |
| [astro](../../skills/coding/astro/SKILL.md) | Coding | "Provides Build content-focused websites with Astro — zero... | Implementation |
| [astropy](../../skills/programming/astropy/SKILL.md) | Programming | Provides Astropy is the core Python package for astronomy,... | Implementation |
| [async](../../skills/programming/async/SKILL.md) | Programming | "Provides Practical async patterns using TaskEither - clean... | Implementation |
| [async-patterns](../../skills/programming/async-patterns/SKILL.md) | Programming | "Provides Master Rust async programming with Tokio, async... | Implementation |
| [audience-analysis](../../skills/agent/audience-analysis/SKILL.md) | Agent | Provides Understand audience demographics, preferences,... | Implementation |
| [audio](../../skills/agent/audio/SKILL.md) | Agent | "Implements text-to-speech and speech-to-text using fal.ai... | Implementation |
| [audio](../../skills/programming/audio/SKILL.md) | Programming | "Provides Game audio principles. Sound design, music... | Implementation |
| [audit](../../skills/agent/audit/SKILL.md) | Agent | Provides Comprehensive security auditing workflow covering... | Implementation |
| [audit](../../skills/coding/audit/SKILL.md) | Coding | "Detects missing zeroization of sensitive data in source... | Review |
| [audit](../../skills/programming/audit/SKILL.md) | Programming | "Provides Diagnose and audit SEO issues affecting... | Implementation |
| [audit](../../skills/programming/audit/SKILL.md) | Programming | "Provides Audit screens against Nielsen's heuristics and... | Implementation |
| [audit-patterns](../../skills/programming/audit-patterns/SKILL.md) | Programming | "Provides Comprehensive guide to auditing web content... | Implementation |
| [audit-pre-push](../../skills/programming/audit-pre-push/SKILL.md) | Programming | 'Provides Deep audit before GitHub push: removes junk... | Implementation |
| [auditor](../../skills/coding/auditor/SKILL.md) | Coding | "Provides Expert security auditor specializing in... | Review |
| [auth](../../skills/programming/auth/SKILL.md) | Programming | "Provides Expert patterns for Clerk auth implementation,... | Implementation |
| [authentication](../../skills/coding/authentication/SKILL.md) | Coding | "Provides Identify and exploit authentication and session... | Review |
| [authority-builder](../../skills/programming/authority-builder/SKILL.md) | Programming | "Analyzes content for E-E-A-T signals and suggests... | Implementation |
| [auto-research](../../skills/agent/auto-research/SKILL.md) | Agent | "Provides Automatically fetch latest library/framework... | Implementation |
| [automated-tests](../../skills/programming/automated-tests/SKILL.md) | Programming | "Provides Write and run Odoo automated tests using... | Implementation |
| [automation](../../skills/agent/automation/SKILL.md) | Agent | 'Provides Automate Airtable tasks via Rube MCP (Composio):... | Implementation |
| [automation](../../skills/agent/automation/SKILL.md) | Agent | "Provides Automate Bitbucket repositories, pull requests,... | Orchestration |
| [automation](../../skills/agent/automation/SKILL.md) | Agent | "Provides Automate changelog generation from commits, PRs,... | Orchestration |
| [automation](../../skills/agent/automation/SKILL.md) | Agent | 'Provides Automate CircleCI tasks via Rube MCP (Composio):... | Implementation |
| [automation](../../skills/agent/automation/SKILL.md) | Agent | Provides Automate ClickUp project management including... | Implementation |
| [automation](../../skills/agent/automation/SKILL.md) | Agent | Provides Automate Freshdesk helpdesk operations including... | Implementation |
| [automation](../../skills/agent/automation/SKILL.md) | Agent | "Provides Automate GitHub repositories, issues, pull... | Orchestration |
| [automation](../../skills/agent/automation/SKILL.md) | Agent | "Provides Automate GitLab project management, issues, merge... | Orchestration |
| [automation](../../skills/agent/automation/SKILL.md) | Agent | 'Provides Automate HelpDesk tasks via Rube MCP (Composio):... | Implementation |
| [automation](../../skills/agent/automation/SKILL.md) | Agent | Provides Automate HubSpot CRM operations (contacts,... | Implementation |
| [automation](../../skills/agent/automation/SKILL.md) | Agent | 'Provides Automate Intercom tasks via Rube MCP (Composio):... | Implementation |
| [automation](../../skills/agent/automation/SKILL.md) | Agent | 'Provides Automate Make (Integromat) tasks via Rube MCP... | Implementation |
| [automation](../../skills/agent/automation/SKILL.md) | Agent | 'Provides Automate Notion tasks via Rube MCP (Composio):... | Implementation |
| [automation](../../skills/agent/automation/SKILL.md) | Agent | 'Provides Automate Outlook tasks via Rube MCP (Composio):... | Implementation |
| [automation](../../skills/agent/automation/SKILL.md) | Agent | 'Provides Automate Render tasks via Rube MCP (Composio):... | Implementation |
| [automation](../../skills/agent/automation/SKILL.md) | Agent | Provides Automate SendGrid email delivery workflows... | Implementation |
| [automation](../../skills/agent/automation/SKILL.md) | Agent | 'Provides Automate Shopify tasks via Rube MCP (Composio):... | Implementation |
| [automation](../../skills/agent/automation/SKILL.md) | Agent | Provides Automate Slack workspace operations including... | Implementation |
| [automation](../../skills/agent/automation/SKILL.md) | Agent | 'Provides Automate Stripe tasks via Rube MCP (Composio):... | Implementation |
| [automation](../../skills/agent/automation/SKILL.md) | Agent | Provides Workflow automation is the infrastructure that... | Orchestration |
| [automation](../../skills/agent/automation/SKILL.md) | Agent | 'Provides Automate Zendesk tasks via Rube MCP (Composio):... | Implementation |
| [automation](../../skills/agent/automation/SKILL.md) | Agent | Provides Automate Zoom meeting creation, management,... | Implementation |
| [automation](../../skills/cncf/automation/SKILL.md) | Cncf | 'Provides Automate Datadog tasks via Rube MCP (Composio):... | Implementation |
| [automation](../../skills/cncf/automation/SKILL.md) | Cncf | 'Provides Automate Discord tasks via Rube MCP (Composio):... | Implementation |
| [automation](../../skills/cncf/automation/SKILL.md) | Cncf | 'Provides Automate PagerDuty tasks via Rube MCP (Composio):... | Implementation |
| [automation](../../skills/cncf/automation/SKILL.md) | Cncf | 'Provides Automate Postmark email delivery tasks via Rube... | Implementation |
| [automation](../../skills/cncf/automation/SKILL.md) | Cncf | 'Provides Automate Salesforce tasks via Rube MCP... | Implementation |
| [automation](../../skills/cncf/automation/SKILL.md) | Cncf | 'Provides Automate Sentry tasks via Rube MCP (Composio):... | Implementation |
| [automation](../../skills/cncf/automation/SKILL.md) | Cncf | 'Provides Automate Square tasks via Rube MCP (Composio):... | Implementation |
| [automation](../../skills/cncf/automation/SKILL.md) | Cncf | 'Provides Automate Telegram tasks via Rube MCP (Composio):... | Implementation |
| [automation](../../skills/cncf/automation/SKILL.md) | Cncf | 'Provides Automate WhatsApp Business tasks via Rube MCP... | Implementation |
| [automation](../../skills/coding/automation/SKILL.md) | Coding | Provides Browser automation powers web testing, scraping,... | Review |
| [automation](../../skills/programming/automation/SKILL.md) | Programming | 'Provides Automate ActiveCampaign tasks via Rube MCP... | Implementation |
| [automation](../../skills/programming/automation/SKILL.md) | Programming | 'Provides Automate Amplitude tasks via Rube MCP (Composio):... | Implementation |
| [automation](../../skills/programming/automation/SKILL.md) | Programming | 'Provides Automate Asana tasks via Rube MCP (Composio):... | Implementation |
| [automation](../../skills/programming/automation/SKILL.md) | Programming | 'Provides Automate BambooHR tasks via Rube MCP (Composio):... | Implementation |
| [automation](../../skills/programming/automation/SKILL.md) | Programming | "Provides Automate Basecamp project management, to-dos,... | Implementation |
| [automation](../../skills/programming/automation/SKILL.md) | Programming | "Provides Master automated billing systems including... | Implementation |
| [automation](../../skills/programming/automation/SKILL.md) | Programming | "Provides Automate Box operations including file... | Implementation |
| [automation](../../skills/programming/automation/SKILL.md) | Programming | "Provides Automate Brevo (formerly Sendinblue) email... | Implementation |
| [automation](../../skills/programming/automation/SKILL.md) | Programming | "Provides Automate Calendly scheduling, event management,... | Implementation |
| [automation](../../skills/programming/automation/SKILL.md) | Programming | 'Provides Automate Canva tasks via Rube MCP (Composio):... | Implementation |
| [automation](../../skills/programming/automation/SKILL.md) | Programming | 'Provides Automate Close CRM tasks via Rube MCP (Composio):... | Implementation |
| [automation](../../skills/programming/automation/SKILL.md) | Programming | 'Provides Automate Coda tasks via Rube MCP (Composio):... | Implementation |
| [automation](../../skills/programming/automation/SKILL.md) | Programming | "Provides Automate Confluence page creation, content... | Implementation |
| [automation](../../skills/programming/automation/SKILL.md) | Programming | 'Provides Automate ConvertKit (Kit) tasks via Rube MCP... | Implementation |
| [automation](../../skills/programming/automation/SKILL.md) | Programming | 'Provides Automate DocuSign tasks via Rube MCP (Composio):... | Implementation |
| [automation](../../skills/programming/automation/SKILL.md) | Programming | "Provides Automate Dropbox file management, sharing,... | Implementation |
| [automation](../../skills/programming/automation/SKILL.md) | Programming | 'Provides Automate Figma tasks via Rube MCP (Composio):... | Implementation |
| [automation](../../skills/programming/automation/SKILL.md) | Programming | 'Provides Automate Freshservice ITSM tasks via Rube MCP... | Implementation |
| [automation](../../skills/programming/automation/SKILL.md) | Programming | "Provides Lightweight Gmail integration with standalone... | Implementation |
| [automation](../../skills/programming/automation/SKILL.md) | Programming | "Provides Automate Google Sheets operations (read, write,... | Implementation |
| [automation](../../skills/programming/automation/SKILL.md) | Programming | 'Provides Automate Instagram tasks via Rube MCP (Composio):... | Implementation |
| [automation](../../skills/programming/automation/SKILL.md) | Programming | 'Provides Automate Jira tasks via Rube MCP (Composio):... | Implementation |
| [automation](../../skills/programming/automation/SKILL.md) | Programming | 'Provides Automate Klaviyo tasks via Rube MCP (Composio):... | Implementation |
| [automation](../../skills/programming/automation/SKILL.md) | Programming | 'Provides Automate Linear tasks via Rube MCP (Composio):... | Implementation |
| [automation](../../skills/programming/automation/SKILL.md) | Programming | 'Provides Automate LinkedIn tasks via Rube MCP (Composio):... | Implementation |
| [automation](../../skills/programming/automation/SKILL.md) | Programming | "Provides Automate Mailchimp email marketing including... | Implementation |
| [automation](../../skills/programming/automation/SKILL.md) | Programming | 'Provides Automate Miro tasks via Rube MCP (Composio):... | Implementation |
| [automation](../../skills/programming/automation/SKILL.md) | Programming | 'Provides Automate Mixpanel tasks via Rube MCP (Composio):... | Implementation |
| [automation](../../skills/programming/automation/SKILL.md) | Programming | "Provides Automate Monday.com work management including... | Implementation |
| [automation](../../skills/programming/automation/SKILL.md) | Programming | "Provides Automate Pipedrive CRM operations including... | Implementation |
| [automation](../../skills/programming/automation/SKILL.md) | Programming | 'Provides Automate PostHog tasks via Rube MCP (Composio):... | Implementation |
| [automation](../../skills/programming/automation/SKILL.md) | Programming | 'Provides Automate Reddit tasks via Rube MCP (Composio):... | Implementation |
| [automation](../../skills/programming/automation/SKILL.md) | Programming | 'Provides Automate Segment tasks via Rube MCP (Composio):... | Implementation |
| [automation](../../skills/programming/automation/SKILL.md) | Programming | "Provides Automate Supabase database queries, table... | Implementation |
| [automation](../../skills/programming/automation/SKILL.md) | Programming | 'Provides Automate TikTok tasks via Rube MCP (Composio):... | Implementation |
| [automation](../../skills/programming/automation/SKILL.md) | Programming | "Provides Automate Todoist task management, projects,... | Implementation |
| [automation](../../skills/programming/automation/SKILL.md) | Programming | "Provides Automate Trello boards, cards, and workflows via... | Implementation |
| [automation](../../skills/programming/automation/SKILL.md) | Programming | 'Provides Automate Twitter/X tasks via Rube MCP (Composio):... | Implementation |
| [automation](../../skills/programming/automation/SKILL.md) | Programming | 'Provides Automate Vercel tasks via Rube MCP (Composio):... | Implementation |
| [automation](../../skills/programming/automation/SKILL.md) | Programming | "Provides Automate Webflow CMS collections, site... | Implementation |
| [automation](../../skills/programming/automation/SKILL.md) | Programming | 'Provides Automate Wrike project management via Rube MCP... | Implementation |
| [automation](../../skills/programming/automation/SKILL.md) | Programming | 'Provides Automate YouTube tasks via Rube MCP (Composio):... | Implementation |
| [automation-demo](../../skills/coding/automation-demo/SKILL.md) | Coding | "Demonstrates the skill automation system with pre-commit... | Implementation |
| [automation-workflow-automate](../../skills/agent/automation-workflow-automate/SKILL.md) | Agent | Provides You are a workflow automation expert specializing... | Implementation |
| [automator](../../skills/coding/automator/SKILL.md) | Coding | Provides Master AI-powered test automation with modern... | Review |
| [automator](../../skills/programming/automator/SKILL.md) | Programming | "Provides Draft cold emails, follow-ups, and proposal... | Implementation |
| [autoscaling-advisor](../../skills/agent/autoscaling-advisor/SKILL.md) | Agent | "Advisors on optimal auto-scaling configurations for... | Optimization |
| [avaliacao](../../skills/programming/avaliacao/SKILL.md) | Programming | "Provides Avaliacao pericial de imoveis em leilao. Valor de... | Implementation |
| [aversion-designer](../../skills/programming/aversion-designer/SKILL.md) | Programming | "Provides one sentence - what this skill does and when to... | Implementation |
| [aws-auto-scaling](../../skills/cncf/aws-auto-scaling/SKILL.md) | Cncf | "Configures automatic scaling of compute resources (EC2,... | Reference |
| [aws-cloudformation](../../skills/cncf/aws-cloudformation/SKILL.md) | Cncf | "Creates Infrastructure as Code templates with... | Reference |
| [aws-cloudfront](../../skills/cncf/aws-cloudfront/SKILL.md) | Cncf | "Configures CloudFront CDN for global content distribution... | Reference |
| [aws-cloudwatch](../../skills/cncf/aws-cloudwatch/SKILL.md) | Cncf | "Configures CloudWatch monitoring with metrics, logs,... | Reference |
| [aws-dynamodb](../../skills/cncf/aws-dynamodb/SKILL.md) | Cncf | "Deploys managed NoSQL databases with DynamoDB for... | Reference |
| [aws-ec2](../../skills/cncf/aws-ec2/SKILL.md) | Cncf | "Deploys, configures, and auto-scales EC2 instances with... | Reference |
| [aws-ecr](../../skills/cncf/aws-ecr/SKILL.md) | Cncf | "Manages container image repositories with ECR for secure... | Reference |
| [aws-eks](../../skills/cncf/aws-eks/SKILL.md) | Cncf | "Deploys managed Kubernetes clusters with EKS for container... | Reference |
| [aws-elb](../../skills/cncf/aws-elb/SKILL.md) | Cncf | "Configures Elastic Load Balancing (ALB, NLB, Classic) for... | Reference |
| [aws-iam](../../skills/cncf/aws-iam/SKILL.md) | Cncf | "Configures identity and access management with IAM users,... | Reference |
| [aws-kms](../../skills/cncf/aws-kms/SKILL.md) | Cncf | "Manages encryption keys with AWS KMS for data protection... | Reference |
| [aws-lambda](../../skills/cncf/aws-lambda/SKILL.md) | Cncf | "Deploys serverless event-driven applications with Lambda... | Reference |
| [aws-modules](../../skills/cncf/aws-modules/SKILL.md) | Cncf | "Provides Terraform module creation for AWS — reusable... | Implementation |
| [aws-rds](../../skills/cncf/aws-rds/SKILL.md) | Cncf | "Deploys managed relational databases (MySQL, PostgreSQL,... | Reference |
| [aws-route53](../../skills/cncf/aws-route53/SKILL.md) | Cncf | "Configures DNS routing with Route 53 for domain... | Reference |
| [aws-s3](../../skills/cncf/aws-s3/SKILL.md) | Cncf | "Configures S3 object storage with versioning, lifecycle... | Reference |
| [aws-secrets-manager](../../skills/cncf/aws-secrets-manager/SKILL.md) | Cncf | "Manages sensitive data with automatic encryption,... | Reference |
| [aws-sns](../../skills/cncf/aws-sns/SKILL.md) | Cncf | "Deploys managed pub/sub messaging with SNS for... | Reference |
| [aws-sqs](../../skills/cncf/aws-sqs/SKILL.md) | Cncf | "Deploys managed message queues with SQS for asynchronous... | Reference |
| [aws-ssm](../../skills/cncf/aws-ssm/SKILL.md) | Cncf | "Manages EC2 instances and on-premises servers with AWS... | Reference |
| [aws-vpc](../../skills/cncf/aws-vpc/SKILL.md) | Cncf | "Configures Virtual Private Clouds with subnets, route... | Reference |
| [axiom](../../skills/programming/axiom/SKILL.md) | Programming | "Provides First-principles assumption auditor. Classifies... | Implementation |
| [azure-aks](../../skills/cncf/azure-aks/SKILL.md) | Cncf | "Provides Managed Kubernetes cluster with automatic scaling... | Reference |
| [azure-automation](../../skills/cncf/azure-automation/SKILL.md) | Cncf | Provides Automation and orchestration of Azure resources... | Reference |
| [azure-blob-storage](../../skills/cncf/azure-blob-storage/SKILL.md) | Cncf | Provides Object storage with versioning, lifecycle... | Reference |
| [azure-cdn](../../skills/cncf/azure-cdn/SKILL.md) | Cncf | Provides Content delivery network for caching and global... | Reference |
| [azure-container-registry](../../skills/cncf/azure-container-registry/SKILL.md) | Cncf | "Provides Stores and manages container images with... | Reference |
| [azure-cosmos-db](../../skills/cncf/azure-cosmos-db/SKILL.md) | Cncf | Provides Global NoSQL database with multi-region... | Reference |
| [azure-event-hubs](../../skills/cncf/azure-event-hubs/SKILL.md) | Cncf | "Provides Event streaming platform for high-throughput data... | Reference |
| [azure-functions](../../skills/cncf/azure-functions/SKILL.md) | Cncf | Provides Serverless computing with event-driven functions... | Reference |
| [azure-key-vault](../../skills/cncf/azure-key-vault/SKILL.md) | Cncf | "Manages encryption keys, secrets, and certificates with... | Reference |
| [azure-keyvault-secrets](../../skills/cncf/azure-keyvault-secrets/SKILL.md) | Cncf | "Provides Secret management and rotation for sensitive... | Reference |
| [azure-load-balancer](../../skills/cncf/azure-load-balancer/SKILL.md) | Cncf | Provides Distributes traffic across VMs with health probes... | Reference |
| [azure-monitor](../../skills/cncf/azure-monitor/SKILL.md) | Cncf | "Provides Monitoring and logging for Azure resources with... | Reference |
| [azure-rbac](../../skills/cncf/azure-rbac/SKILL.md) | Cncf | "Manages identity and access with roles, service... | Reference |
| [azure-resource-manager](../../skills/cncf/azure-resource-manager/SKILL.md) | Cncf | "Provides Infrastructure as code using ARM templates for... | Reference |
| [azure-scale-sets](../../skills/cncf/azure-scale-sets/SKILL.md) | Cncf | "Manages auto-scaling VM groups with load balancing and... | Reference |
| [azure-service-bus](../../skills/cncf/azure-service-bus/SKILL.md) | Cncf | "Provides Messaging service with queues and topics for... | Reference |
| [azure-sql-database](../../skills/cncf/azure-sql-database/SKILL.md) | Cncf | Provides Managed relational database with elastic pools,... | Reference |
| [azure-traffic-manager](../../skills/cncf/azure-traffic-manager/SKILL.md) | Cncf | Provides DNS-based traffic routing with health checks and... | Reference |
| [azure-virtual-machines](../../skills/cncf/azure-virtual-machines/SKILL.md) | Cncf | "Deploys and manages VMs with auto-scaling, availability... | Reference |
| [azure-virtual-networks](../../skills/cncf/azure-virtual-networks/SKILL.md) | Cncf | "Provides Networking with subnets, network security groups,... | Reference |
| [azure-webjobs-extensions-authentication-events-dotnet](../../skills/cncf/azure-webjobs-extensions-authentication-events-dotnet/SKILL.md) | Cncf | "Provides Microsoft Entra Authentication Events SDK for... | Implementation |
| [backend](../../skills/coding/backend/SKILL.md) | Coding | "Provides Build ASP.NET Core 8+ backend services with EF... | Implementation |
| [backend](../../skills/programming/backend/SKILL.md) | Programming | "Provides Functional programming patterns for Node.js/Deno... | Implementation |
| [backend-patterns](../../skills/coding/backend-patterns/SKILL.md) | Coding | "Provides Master C#/.NET patterns for building... | Implementation |
| [backend-patterns](../../skills/coding/backend-patterns/SKILL.md) | Coding | "Provides Comprehensive guidance for building scalable,... | Implementation |
| [backstage](../../skills/cncf/backstage/SKILL.md) | Cncf | "Provides Backstage in Cloud-Native Engineering - Developer... | Reference |
| [backtest-drawdown-analysis](../../skills/trading/backtest-drawdown-analysis/SKILL.md) | Trading | "Implements maximum drawdown, recovery time, and... | Implementation |
| [backtest-lookahead-bias](../../skills/trading/backtest-lookahead-bias/SKILL.md) | Trading | "Preventing lookahead bias in backtesting through strict... | Implementation |
| [backtest-position-exits](../../skills/trading/backtest-position-exits/SKILL.md) | Trading | "Exit strategies, trailing stops, and take-profit... | Implementation |
| [backtest-position-sizing](../../skills/trading/backtest-position-sizing/SKILL.md) | Trading | "'Position Sizing Algorithms: Fixed Fractional, Kelly... | Implementation |
| [backtest-sharpe-ratio](../../skills/trading/backtest-sharpe-ratio/SKILL.md) | Trading | "Provides Sharpe Ratio Calculation and Risk-Adjusted... | Implementation |
| [backtest-walk-forward](../../skills/trading/backtest-walk-forward/SKILL.md) | Trading | "Implements walk-forward optimization for robust strategy... | Implementation |
| [backup-strategy](../../skills/programming/backup-strategy/SKILL.md) | Programming | 'Provides Complete Odoo backup and restore strategy:... | Implementation |
| [base](../../skills/cncf/base/SKILL.md) | Cncf | Provides Database management, forms, reports, and data... | Implementation |
| [bases](../../skills/programming/bases/SKILL.md) | Programming | Provides Create and edit Obsidian Bases (.base files) with... | Implementation |
| [basics](../../skills/programming/basics/SKILL.md) | Programming | "CRITICAL: Use for Makepad getting started and app... | Implementation |
| [batch-refactor](../../skills/programming/batch-refactor/SKILL.md) | Programming | "Provides Plan and execute large refactors with... | Implementation |
| [bd-agent](../../skills/programming/bd-agent/SKILL.md) | Programming | "Provides Production-tested patterns for building AI agents... | Implementation |
| [before-completion](../../skills/agent/before-completion/SKILL.md) | Agent | "Provides Claiming work is complete without verification is... | Orchestration |
| [behavioral-xray](../../skills/agent/behavioral-xray/SKILL.md) | Agent | "Provides X-ray any AI model's behavioral patterns —... | Implementation |
| [best-practices](../../skills/cncf/best-practices/SKILL.md) | Cncf | Provides CloudFormation template optimization, nested... | Implementation |
| [best-practices](../../skills/cncf/best-practices/SKILL.md) | Cncf | Provides Postgres performance optimization and best... | Implementation |
| [best-practices](../../skills/coding/best-practices/SKILL.md) | Coding | Provides Next.js App Router principles. Server Components,... | Implementation |
| [best-practices](../../skills/coding/best-practices/SKILL.md) | Coding | "Provides Node.js development principles and... | Implementation |
| [best-practices](../../skills/programming/best-practices/SKILL.md) | Programming | "Provides Angular performance optimization and best... | Implementation |
| [best-practices](../../skills/programming/best-practices/SKILL.md) | Programming | "Provides Comprehensive performance optimization guide for... | Implementation |
| [best-practices](../../skills/programming/best-practices/SKILL.md) | Programming | "Provides best practices for remotion - video creation in... | Implementation |
| [biopython](../../skills/programming/biopython/SKILL.md) | Programming | "Provides Biopython is a comprehensive set of freely... | Implementation |
| [blockrun](../../skills/programming/blockrun/SKILL.md) | Programming | "Provides blockrun works with claude code and google... | Implementation |
| [bluebook-builder](../../skills/coding/bluebook-builder/SKILL.md) | Coding | "Provides Build a minimal but real security policy for... | Review |
| [blueprint](../../skills/agent/blueprint/SKILL.md) | Agent | "Provides Turn a one-line objective into a step-by-step... | Orchestration |
| [bob-craft](../../skills/coding/bob-craft/SKILL.md) | Coding | "Provides use when performing code review, writing or... | Review |
| [bot-architect](../../skills/programming/bot-architect/SKILL.md) | Programming | "Provides Specialized skill for building production-ready... | Implementation |
| [bot-builder](../../skills/cncf/bot-builder/SKILL.md) | Cncf | "Provides Build Slack apps using the Bolt framework across... | Implementation |
| [bot-builder](../../skills/cncf/bot-builder/SKILL.md) | Cncf | "Provides Expert in building Telegram bots that solve real... | Implementation |
| [brainstorming](../../skills/programming/brainstorming/SKILL.md) | Programming | "Provides use before creative or constructive work... | Implementation |
| [branch](../../skills/agent/branch/SKILL.md) | Agent | "Provides Create a git branch following Sentry naming... | Orchestration |
| [brand-reputation-monitoring](../../skills/agent/brand-reputation-monitoring/SKILL.md) | Agent | Provides Scrape reviews, ratings, and brand mentions from... | Implementation |
| [browser-automation](../../skills/coding/browser-automation/SKILL.md) | Coding | "Provides AI-powered browser automation — navigate sites,... | Implementation |
| [brutalist-ui](../../skills/coding/brutalist-ui/SKILL.md) | Coding | Provides use when creating raw industrial or tactical... | Implementation |
| [buffett](../../skills/programming/buffett/SKILL.md) | Programming | "Provides Agente que simula Warren Buffett — o maior... | Implementation |
| [bugs](../../skills/coding/bugs/SKILL.md) | Coding | "Provides Find bugs, security vulnerabilities, and code... | Review |
| [build](../../skills/agent/build/SKILL.md) | Agent | "Implements build for orchestration and agent coordination... | Orchestration |
| [build](../../skills/programming/build/SKILL.md) | Programming | "Provides Build, maintain, and extend the EarLLM One... | Implementation |
| [build-optimization](../../skills/programming/build-optimization/SKILL.md) | Programming | "Provides Optimize Bazel builds for large-scale monorepos.... | Implementation |
| [builder](../../skills/agent/builder/SKILL.md) | Agent | Provides Create MCP (Model Context Protocol) servers that... | Implementation |
| [builder](../../skills/programming/builder/SKILL.md) | Programming | Provides Main application building orchestrator. Creates... | Implementation |
| [builder](../../skills/programming/builder/SKILL.md) | Programming | "Creates exhaustive technical references and API... | Implementation |
| [builder-ms](../../skills/agent/builder-ms/SKILL.md) | Agent | Provides use this skill when building mcp servers to... | Implementation |
| [buildpacks](../../skills/cncf/buildpacks/SKILL.md) | Cncf | "Provides Buildpacks in Cloud-Native Engineering - Turn... | Reference |
| [bukkit-pro](../../skills/programming/bukkit-pro/SKILL.md) | Programming | "Provides Master Minecraft server plugin development with... | Implementation |
| [bulletmind](../../skills/programming/bulletmind/SKILL.md) | Programming | "Provides Convert input into clean, structured,... | Implementation |
| [business-analyst-business-case](../../skills/programming/business-analyst-business-case/SKILL.md) | Programming | "Generate comprehensive investor-ready business case... | Implementation |
| [business-analyst-financial-projections](../../skills/programming/business-analyst-financial-projections/SKILL.md) | Programming | "Create detailed 3-5 year financial model with revenue,... | Implementation |
| [business-analyst-market-opportunity](../../skills/programming/business-analyst-market-opportunity/SKILL.md) | Programming | "Generate comprehensive market opportunity analysis with... | Implementation |
| [buttercup](../../skills/programming/buttercup/SKILL.md) | Programming | "Provides All pods run in namespace crs. Use when pods in... | Implementation |
| [by-design](../../skills/coding/by-design/SKILL.md) | Coding | "Provides use when building apps that collect user data.... | Review |
| [caching](../../skills/programming/caching/SKILL.md) | Programming | Provides Caching strategies for LLM prompts including... | Implementation |
| [caching](../../skills/programming/caching/SKILL.md) | Programming | "Provides Configure Turborepo for efficient monorepo builds... | Implementation |
| [calc](../../skills/programming/calc/SKILL.md) | Programming | "Provides Spreadsheet creation, format conversion... | Implementation |
| [calendar-automation](../../skills/agent/calendar-automation/SKILL.md) | Agent | 'Provides Automate Outlook Calendar tasks via Rube MCP... | Implementation |
| [calendar-automation](../../skills/programming/calendar-automation/SKILL.md) | Programming | "Provides Lightweight Google Calendar integration with... | Implementation |
| [calibrator](../../skills/programming/calibrator/SKILL.md) | Programming | "Provides one sentence - what this skill does and when to... | Implementation |
| [calico](../../skills/cncf/calico/SKILL.md) | Cncf | "Calico in Cloud Native Security - cloud native... | Reference |
| [call-handoff-patterns](../../skills/cncf/call-handoff-patterns/SKILL.md) | Cncf | Provides Effective patterns for on-call shift transitions,... | Implementation |
| [cannibalization-detector](../../skills/programming/cannibalization-detector/SKILL.md) | Programming | "Analyzes multiple provided pages to identify keyword... | Implementation |
| [canvas](../../skills/programming/canvas/SKILL.md) | Programming | "Provides Create and edit JSON Canvas files (.canvas) with... | Implementation |
| [canvas-architect](../../skills/programming/canvas-architect/SKILL.md) | Programming | "Provides Iterative consultant agent for building and... | Implementation |
| [card](../../skills/programming/card/SKILL.md) | Programming | "Provides 生成紧急情况下快速访 问的医疗信息摘要卡片。当用户 需要旅行、就诊准备、紧急情况 或询问... | Implementation |
| [carlo-monitor-creation](../../skills/programming/carlo-monitor-creation/SKILL.md) | Programming | "Guides creation of Monte Carlo monitors via MCP tools,... | Implementation |
| [carlo-prevent](../../skills/programming/carlo-prevent/SKILL.md) | Programming | Provides Surfaces Monte Carlo data observability context... | Implementation |
| [carlo-push-ingestion](../../skills/programming/carlo-push-ingestion/SKILL.md) | Programming | Provides Expert guide for pushing metadata, lineage, and... | Implementation |
| [carlo-validation-notebook](../../skills/programming/carlo-validation-notebook/SKILL.md) | Programming | Generates SQL validation notebooks for dbt PR changes with... | Implementation |
| [cdp](../../skills/programming/cdp/SKILL.md) | Programming | Provides Expert patterns for Segment Customer Data Platform... | Implementation |
| [centric-high-seo-optimized-blogwriting-skill](../../skills/programming/centric-high-seo-optimized-blogwriting-skill/SKILL.md) | Programming | "Provides use this skill when the user asks to write a blog... | Implementation |
| [cert-manager](../../skills/cncf/cert-manager/SKILL.md) | Cncf | "cert-manager in Cloud-Native Engineering - Certificate... | Reference |
| [chain-risk-auditor](../../skills/programming/chain-risk-auditor/SKILL.md) | Programming | "Provides Identifies dependencies at heightened risk of... | Implementation |
| [change-tracker](../../skills/programming/change-tracker/SKILL.md) | Programming | "Provides Track code changes with structured JSON records,... | Implementation |
| [changelog](../../skills/programming/changelog/SKILL.md) | Programming | "Provides Generate structured changelogs from git history.... | Implementation |
| [channel-factories](../../skills/programming/channel-factories/SKILL.md) | Programming | "Provides Technical reference on Lightning Network channel... | Implementation |
| [chaosmesh](../../skills/cncf/chaosmesh/SKILL.md) | Cncf | ''Provides Chaos Mesh in Cloud-Native Engineering... | Reference |
| [chart-scaffolding](../../skills/cncf/chart-scaffolding/SKILL.md) | Cncf | Provides Comprehensive guidance for creating, organizing,... | Implementation |
| [chat-agent-discovery](../../skills/programming/chat-agent-discovery/SKILL.md) | Programming | "Provides Discover and search 18K+ MCP servers and AI... | Implementation |
| [check](../../skills/programming/check/SKILL.md) | Programming | "Provides Validate Claude Code skills against the... | Implementation |
| [checklist](../../skills/coding/checklist/SKILL.md) | Coding | "Provides Provide a comprehensive checklist for planning,... | Review |
| [chinese](../../skills/programming/chinese/SKILL.md) | Programming | "Provides Detect and rewrite AI-like Chinese text with a... | Implementation |
| [ci-cd-pipeline-analyzer](../../skills/agent/ci-cd-pipeline-analyzer/SKILL.md) | Agent | "Analyzes CI/CD pipelines for optimization opportunities,... | Optimization |
| [ci-patterns](../../skills/agent/ci-patterns/SKILL.md) | Agent | "Provides Comprehensive GitLab CI/CD pipeline patterns for... | Orchestration |
| [cicd-workflows](../../skills/programming/cicd-workflows/SKILL.md) | Programming | "Provides Helps understand and write EAS workflow YAML... | Implementation |
| [cilium](../../skills/cncf/cilium/SKILL.md) | Cncf | "Cilium in Cloud Native Network - cloud native... | Reference |
| [cirq](../../skills/programming/cirq/SKILL.md) | Programming | "Provides Cirq is Google Quantum AI's open-source framework... | Implementation |
| [claude-skill](../../skills/coding/claude-skill/SKILL.md) | Coding | "Implements web fuzzing with ffuf patterns for software... | Review |
| [claude-skill](../../skills/coding/claude-skill/SKILL.md) | Coding | "Provides Secure environment variable management ensuring... | Review |
| [claude-skill](../../skills/programming/claude-skill/SKILL.md) | Programming | "Provides manage linear issues, projects, and teams... | Implementation |
| [cleanup-deps-audit](../../skills/programming/cleanup-deps-audit/SKILL.md) | Programming | "Provides You are a dependency security expert specializing... | Implementation |
| [cleanup-refactor-clean](../../skills/programming/cleanup-refactor-clean/SKILL.md) | Programming | "Provides You are a code refactoring expert specializing in... | Implementation |
| [cleanup-tech-debt](../../skills/coding/cleanup-tech-debt/SKILL.md) | Coding | "Provides You are a technical debt expert specializing in... | Review |
| [cli](../../skills/programming/cli/SKILL.md) | Programming | "Provides GDB debugging assistant for AI agents - analyze... | Implementation |
| [cli](../../skills/programming/cli/SKILL.md) | Programming | 'Provides use when automating linkedin via cli: fetch... | Implementation |
| [cli](../../skills/programming/cli/SKILL.md) | Programming | "Provides use mmx to generate text, images, video, speech,... | Implementation |
| [cli](../../skills/programming/cli/SKILL.md) | Programming | "Provides use the obsidian cli to read, create, search, and... | Implementation |
| [cli](../../skills/programming/cli/SKILL.md) | Programming | "Provides Semantic file discovery via `vexor`. Use whenever... | Implementation |
| [clipper-template-creator](../../skills/programming/clipper-template-creator/SKILL.md) | Programming | "Provides Guide for creating templates for the Obsidian Web... | Implementation |
| [cloud-api](../../skills/coding/cloud-api/SKILL.md) | Coding | "Provides Integracao com WhatsApp Business Cloud API... | Implementation |
| [cloud-architect](../../skills/cncf/cloud-architect/SKILL.md) | Cncf | "Provides Expert hybrid cloud architect specializing in... | Implementation |
| [cloud-architecture](../../skills/cncf/cloud-architecture/SKILL.md) | Cncf | "Provides Decision framework and patterns for architecting... | Implementation |
| [cloud-custodian](../../skills/cncf/cloud-custodian/SKILL.md) | Cncf | "Provides Cloud Custodian in Cloud-Native Engineering... | Reference |
| [cloud-networking](../../skills/cncf/cloud-networking/SKILL.md) | Cncf | "Provides Configure secure, high-performance connectivity... | Implementation |
| [cloud-optimization-cost-optimize](../../skills/cncf/cloud-optimization-cost-optimize/SKILL.md) | Cncf | Provides You are a cloud cost optimization expert... | Implementation |
| [cloud-run](../../skills/cncf/cloud-run/SKILL.md) | Cncf | "Provides Specialized skill for building production-ready... | Implementation |
| [cloudevents](../../skills/cncf/cloudevents/SKILL.md) | Cncf | "CloudEvents in Streaming & Messaging - cloud native... | Reference |
| [cni](../../skills/cncf/cni/SKILL.md) | Cncf | "Cni in Cloud-Native Engineering - Container Network... | Reference |
| [coach](../../skills/programming/coach/SKILL.md) | Programming | "Provides Full job search coaching system — JD decoding,... | Implementation |
| [coauthoring](../../skills/programming/coauthoring/SKILL.md) | Programming | "Provides this skill provides a structured workflow for... | Implementation |
| [code](../../skills/coding/code/SKILL.md) | Coding | "Provides Expert C4 Code-level documentation specialist.... | Implementation |
| [code](../../skills/coding/code/SKILL.md) | Coding | "Implements this skill embodies the principles of patterns... | Review |
| [code](../../skills/programming/code/SKILL.md) | Programming | "Provides Generate React code with Rayden UI components... | Implementation |
| [code](../../skills/programming/code/SKILL.md) | Programming | "Provides Review a diff for clarity and safe... | Implementation |
| [code-audit](../../skills/coding/code-audit/SKILL.md) | Coding | "Provides Autonomously deep-scan entire codebase... | Implementation |
| [code-auditor](../../skills/coding/code-auditor/SKILL.md) | Coding | "Provides Audit rapidly generated or AI-produced code for... | Review |
| [code-correctness-verifier](../../skills/agent/code-correctness-verifier/SKILL.md) | Agent | "Verifies code correctness by analyzing syntax, semantics,... | Verification |
| [code-expert](../../skills/programming/code-expert/SKILL.md) | Programming | Provides Especialista profundo em Claude Code - CLI da... | Implementation |
| [code-guide](../../skills/programming/code-guide/SKILL.md) | Programming | Provides To provide a comprehensive reference for... | Implementation |
| [code-javascript](../../skills/agent/code-javascript/SKILL.md) | Agent | Provides Write JavaScript code in n8n Code nodes. Use when... | Implementation |
| [code-python](../../skills/agent/code-python/SKILL.md) | Agent | Provides Write Python code in n8n Code nodes. Use when... | Implementation |
| [code-quality-policies](../../skills/coding/code-quality-policies/SKILL.md) | Coding | "Provides Establishing policies for maintaining a clean... | Implementation |
| [code-review](../../skills/agent/code-review/SKILL.md) | Agent | "Provides Code review requires technical evaluation, not... | Orchestration |
| [code-review](../../skills/agent/code-review/SKILL.md) | Agent | "Provides use when completing tasks, implementing major... | Orchestration |
| [code-review](../../skills/coding/code-review/SKILL.md) | Coding | "Analyzes code diffs and files to identify bugs, security... | Implementation |
| [code-review](../../skills/coding/code-review/SKILL.md) | Coding | "Provides Human review workflow for AI-generated GitHub... | Review |
| [code-validation](../../skills/coding/code-validation/SKILL.md) | Coding | Validates pipeline stages and returns config status strings... | Implementation |
| [collaboration-issue](../../skills/programming/collaboration-issue/SKILL.md) | Programming | "Provides You are a GitHub issue resolution expert... | Implementation |
| [collaboration-standup-notes](../../skills/programming/collaboration-standup-notes/SKILL.md) | Programming | "Provides You are an expert team communication specialist... | Implementation |
| [com-automation](../../skills/programming/com-automation/SKILL.md) | Programming | 'Provides Automate Cal.com tasks via Rube MCP (Composio):... | Implementation |
| [commands](../../skills/coding/commands/SKILL.md) | Coding | "Provides Provide a comprehensive command reference for... | Review |
| [commit](../../skills/agent/commit/SKILL.md) | Agent | "Provides ALWAYS use this skill when committing code... | Orchestration |
| [comms](../../skills/programming/comms/SKILL.md) | Programming | "Provides Write internal communications such as status... | Implementation |
| [comms-anthropic](../../skills/programming/comms-anthropic/SKILL.md) | Programming | 'Provides to write internal communications, use this skill... | Implementation |
| [comms-community](../../skills/programming/comms-community/SKILL.md) | Programming | 'Provides to write internal communications, use this skill... | Implementation |
| [communication-callautomation-java](../../skills/cncf/communication-callautomation-java/SKILL.md) | Cncf | "Provides Build server-side call automation workflows... | Implementation |
| [communication-callingserver-java](../../skills/cncf/communication-callingserver-java/SKILL.md) | Cncf | "Provides ⚠️ DEPRECATED: This SDK has been renamed to Call ... | Implementation |
| [communication-chat-java](../../skills/cncf/communication-chat-java/SKILL.md) | Cncf | "Provides Build real-time chat applications with thread... | Implementation |
| [communication-common-java](../../skills/cncf/communication-common-java/SKILL.md) | Cncf | "Provides Azure Communication Services common utilities for... | Implementation |
| [communication-sms-java](../../skills/cncf/communication-sms-java/SKILL.md) | Cncf | "Provides Send SMS messages with Azure Communication... | Implementation |
| [communications](../../skills/cncf/communications/SKILL.md) | Cncf | 'Provides Build communication features with Twilio: SMS... | Implementation |
| [competitor-intelligence](../../skills/agent/competitor-intelligence/SKILL.md) | Agent | Provides Analyze competitor strategies, content, pricing,... | Implementation |
| [competitor-pages](../../skills/programming/competitor-pages/SKILL.md) | Programming | "Provides Generate SEO-optimized competitor comparison and... | Implementation |
| [compliance](../../skills/coding/compliance/SKILL.md) | Coding | "Provides Master PCI DSS (Payment Card Industry Data... | Review |
| [compliance-accessibility-audit](../../skills/programming/compliance-accessibility-audit/SKILL.md) | Programming | "Provides You are an accessibility expert specializing in... | Implementation |
| [compliance-checker](../../skills/coding/compliance-checker/SKILL.md) | Coding | "Provides Automated compliance checking against CIS,... | Review |
| [compliance-compliance-check](../../skills/coding/compliance-compliance-check/SKILL.md) | Coding | "Provides You are a compliance expert specializing in... | Review |
| [component](../../skills/coding/component/SKILL.md) | Coding | "Provides Expert C4 Component-level documentation... | Implementation |
| [component](../../skills/programming/component/SKILL.md) | Programming | "Provides Generate a new UI component that follows... | Implementation |
| [component-performance](../../skills/programming/component-performance/SKILL.md) | Programming | Provides Diagnose slow React components and suggest... | Implementation |
| [components](../../skills/programming/components/SKILL.md) | Programming | "Provides Core component library and design system... | Implementation |
| [components-content](../../skills/programming/components-content/SKILL.md) | Programming | "Provides Apple Human Interface Guidelines for content... | Implementation |
| [components-controls](../../skills/programming/components-controls/SKILL.md) | Programming | "Provides Check for .claude/apple-design-context.md before... | Implementation |
| [components-dialogs](../../skills/programming/components-dialogs/SKILL.md) | Programming | "Provides Apple HIG guidance for presentation components... | Implementation |
| [components-layout](../../skills/programming/components-layout/SKILL.md) | Programming | "Provides Apple Human Interface Guidelines for layout and... | Implementation |
| [components-menus](../../skills/programming/components-menus/SKILL.md) | Programming | "Provides Check for .claude/apple-design-context.md before... | Implementation |
| [components-search](../../skills/programming/components-search/SKILL.md) | Programming | "Provides Apple HIG guidance for navigation-related... | Implementation |
| [components-status](../../skills/programming/components-status/SKILL.md) | Programming | "Provides Apple HIG guidance for status and progress UI... | Implementation |
| [components-system](../../skills/programming/components-system/SKILL.md) | Programming | 'Provides Apple HIG guidance for system experience... | Implementation |
| [composition-analysis](../../skills/programming/composition-analysis/SKILL.md) | Programming | "Provides Design optimal team structures, hiring plans,... | Implementation |
| [compression](../../skills/programming/compression/SKILL.md) | Programming | Implements when agent sessions generate millions of tokens... | Implementation |
| [compute-batch-java](../../skills/cncf/compute-batch-java/SKILL.md) | Cncf | "Provides Azure Batch SDK for Java. Run large-scale... | Implementation |
| [concurrency-expert](../../skills/programming/concurrency-expert/SKILL.md) | Programming | "Provides Review and fix Swift concurrency issues such as... | Implementation |
| [concurrency-patterns](../../skills/programming/concurrency-patterns/SKILL.md) | Programming | "Provides Master Go concurrency with goroutines, channels,... | Implementation |
| [confidence-based-selector](../../skills/agent/confidence-based-selector/SKILL.md) | Agent | "Selects and executes the most appropriate skill based on... | Orchestration |
| [configuration](../../skills/coding/configuration/SKILL.md) | Coding | "Provides Configure mutual TLS (mTLS) for zero-trust... | Review |
| [configuration](../../skills/coding/configuration/SKILL.md) | Coding | Provides Static Application Security Testing (SAST) tool... | Review |
| [configuration](../../skills/coding/configuration/SKILL.md) | Coding | "Provides Master ShellCheck static analysis configuration... | Review |
| [configuration](../../skills/programming/configuration/SKILL.md) | Programming | Provides Complete guide to Prometheus setup, metric... | Implementation |
| [configurator](../../skills/cncf/configurator/SKILL.md) | Cncf | "Provides Generate production-ready mise.toml setups for... | Implementation |
| [constitution-analyzer](../../skills/programming/constitution-analyzer/SKILL.md) | Programming | "Provides 分析中医体质数据、识 别体质类型、评估体质特征,并提 供个性化养生建议。支持与营养... | Implementation |
| [container](../../skills/coding/container/SKILL.md) | Coding | "Implements expert c4 container-level documentation... | Implementation |
| [container-inspector](../../skills/agent/container-inspector/SKILL.md) | Agent | "Inspects container configurations, runtime state, logs,... | Debugging |
| [container-network-interface-cni](../../skills/cncf/container-network-interface-cni/SKILL.md) | Cncf | "Container Network Interface in Cloud Native Network -... | Reference |
| [containerd](../../skills/cncf/containerd/SKILL.md) | Cncf | "Containerd in Cloud-Native Engineering - An open and... | Reference |
| [containerregistry-py](../../skills/cncf/containerregistry-py/SKILL.md) | Cncf | "Provides Azure Container Registry SDK for Python. Use for... | Implementation |
| [content](../../skills/programming/content/SKILL.md) | Programming | "Provides Content quality and E-E-A-T analysis with AI... | Implementation |
| [content](../../skills/programming/content/SKILL.md) | Programming | "Provides You are an expert social media strategist with... | Implementation |
| [content-analytics](../../skills/agent/content-analytics/SKILL.md) | Agent | Provides Track engagement metrics, measure campaign ROI,... | Implementation |
| [content-auditor](../../skills/programming/content-auditor/SKILL.md) | Programming | "Analyzes provided content for quality, E-E-A-T signals,... | Implementation |
| [content-planner](../../skills/programming/content-planner/SKILL.md) | Programming | "Creates comprehensive content outlines and topic clusters... | Implementation |
| [content-refresher](../../skills/programming/content-refresher/SKILL.md) | Programming | "Provides Identifies outdated elements in provided content... | Implementation |
| [content-writer](../../skills/programming/content-writer/SKILL.md) | Programming | "Provides Writes SEO-optimized content based on provided... | Implementation |
| [context](../../skills/agent/context/SKILL.md) | Agent | "Provides use for file-based context management, dynamic... | Implementation |
| [context](../../skills/coding/context/SKILL.md) | Coding | "Provides Expert C4 Context-level documentation specialist.... | Implementation |
| [context-building](../../skills/agent/context-building/SKILL.md) | Agent | "Enables ultra-granular, line-by-line code analysis to... | Implementation |
| [context-mapping](../../skills/coding/context-mapping/SKILL.md) | Coding | "Provides Map relationships between bounded contexts and... | Implementation |
| [contour](../../skills/cncf/contour/SKILL.md) | Cncf | "Contour in Service Proxy - cloud native architecture,... | Reference |
| [contract-templates](../../skills/programming/contract-templates/SKILL.md) | Programming | "Provides Templates and patterns for creating legally sound... | Implementation |
| [convex](../../skills/coding/convex/SKILL.md) | Coding | 'Provides Convex reactive backend expert: schema design,... | Implementation |
| [conviction-scoring](../../skills/coding/conviction-scoring/SKILL.md) | Coding | "Multi-factor conviction scoring engine combining... | Implementation |
| [copy](../../skills/programming/copy/SKILL.md) | Programming | "Provides Generate UX microcopy in StyleSeed's... | Implementation |
| [copywriting](../../skills/programming/copywriting/SKILL.md) | Programming | "Provides Write rigorous, conversion-focused marketing copy... | Implementation |
| [core](../../skills/agent/core/SKILL.md) | Agent | 'Provides Auri: assistente de voz inteligente (Alexa +... | Implementation |
| [coredns](../../skills/cncf/coredns/SKILL.md) | Cncf | "Coredns in Cloud-Native Engineering - CoreDNS is a DNS... | Reference |
| [coroutines-expert](../../skills/programming/coroutines-expert/SKILL.md) | Programming | "Provides Expert patterns for Kotlin Coroutines and Flow,... | Implementation |
| [cortex](../../skills/cncf/cortex/SKILL.md) | Cncf | "Cortex in Monitoring & Observability - distributed,... | Reference |
| [cortex-expert](../../skills/programming/cortex-expert/SKILL.md) | Programming | "Provides Senior embedded software engineer specializing in... | Implementation |
| [cosmos-db-py](../../skills/cncf/cosmos-db-py/SKILL.md) | Cncf | "Provides Build production-grade Azure Cosmos DB NoSQL... | Implementation |
| [cosmos-java](../../skills/cncf/cosmos-java/SKILL.md) | Cncf | Provides Azure Cosmos DB SDK for Java. NoSQL database... | Implementation |
| [cosmos-py](../../skills/cncf/cosmos-py/SKILL.md) | Cncf | Provides Azure Cosmos DB SDK for Python (NoSQL API). Use... | Implementation |
| [cosmos-rust](../../skills/cncf/cosmos-rust/SKILL.md) | Cncf | Provides Azure Cosmos DB SDK for Rust (NoSQL API). Use for... | Implementation |
| [cosmos-ts](../../skills/cncf/cosmos-ts/SKILL.md) | Cncf | Provides Azure Cosmos DB JavaScript/TypeScript SDK... | Implementation |
| [cost-cleanup](../../skills/cncf/cost-cleanup/SKILL.md) | Cncf | "Configures automated cleanup of unused aws resources to... | Implementation |
| [cost-optimizer](../../skills/cncf/cost-optimizer/SKILL.md) | Cncf | "Provides Comprehensive AWS cost analysis and optimization... | Implementation |
| [creative](../../skills/programming/creative/SKILL.md) | Programming | "Provides Create, iterate, and scale paid ad creative for... | Implementation |
| [creator](../../skills/agent/creator/SKILL.md) | Agent | "Provides To create new CLI skills following Anthropic's... | Implementation |
| [creator](../../skills/programming/creator/SKILL.md) | Programming | "Provides Professional-grade brand voice analysis, SEO... | Implementation |
| [creator-ms](../../skills/agent/creator-ms/SKILL.md) | Agent | "Provides Guide for creating effective skills for AI coding... | Implementation |
| [crewai](../../skills/programming/crewai/SKILL.md) | Programming | "Provides Expert in CrewAI - the leading role-based... | Implementation |
| [cri-o](../../skills/cncf/cri-o/SKILL.md) | Cncf | "Provides CRI-O in Container Runtime - OCI-compliant... | Reference |
| [criminal](../../skills/programming/criminal/SKILL.md) | Programming | "Provides Advogado criminalista especializado em Maria da... | Implementation |
| [crm-automation](../../skills/programming/crm-automation/SKILL.md) | Programming | 'Provides Automate Zoho CRM tasks via Rube MCP (Composio):... | Implementation |
| [cro](../../skills/programming/cro/SKILL.md) | Programming | "Provides Optimize any form that is NOT signup or account... | Implementation |
| [cro](../../skills/programming/cro/SKILL.md) | Programming | "Provides You are an expert in user onboarding and... | Implementation |
| [cro](../../skills/programming/cro/SKILL.md) | Programming | "Provides Analyze and optimize individual pages for... | Implementation |
| [cro](../../skills/programming/cro/SKILL.md) | Programming | "Provides Create and optimize popups, modals, overlays,... | Implementation |
| [crossplane](../../skills/cncf/crossplane/SKILL.md) | Cncf | "Crossplane in Platform Engineering - Kubernetes-native... | Reference |
| [crypto-wallet](../../skills/programming/crypto-wallet/SKILL.md) | Programming | "Provides Crypto wallet management across 7 blockchains via... | Implementation |
| [cubefs](../../skills/cncf/cubefs/SKILL.md) | Cncf | "Provides CubeFS in Storage - distributed, high-performance... | Reference |
| [cve-dependency-management](../../skills/coding/cve-dependency-management/SKILL.md) | Coding | "Provides Cybersecurity operations skill for automating... | Implementation |
| [d3js-skill](../../skills/programming/d3js-skill/SKILL.md) | Programming | Provides this skill provides guidance for creating... | Implementation |
| [dag-patterns](../../skills/agent/dag-patterns/SKILL.md) | Agent | Provides Build production Apache Airflow DAGs with best... | Orchestration |
| [daily](../../skills/programming/daily/SKILL.md) | Programming | "Provides documentation and capabilities reference for... | Implementation |
| [dapr](../../skills/cncf/dapr/SKILL.md) | Cncf | "Provides Dapr in Cloud-Native Engineering - distributed... | Reference |
| [darwin](../../skills/programming/darwin/SKILL.md) | Programming | "Provides Darwinian idea evolution engine — toss rough... | Implementation |
| [dashboard-design](../../skills/programming/dashboard-design/SKILL.md) | Programming | "Provides Comprehensive patterns for designing effective... | Implementation |
| [dashboard-html-jsp-custom-best-pratices](../../skills/coding/dashboard-html-jsp-custom-best-pratices/SKILL.md) | Coding | "Provides this skill should be used when the user asks for... | Implementation |
| [dashboards](../../skills/cncf/dashboards/SKILL.md) | Cncf | Provides Create and manage production-ready Grafana... | Implementation |
| [data-alternative-data](../../skills/trading/data-alternative-data/SKILL.md) | Trading | "Alternative data ingestion pipelines for trading signals... | Implementation |
| [data-backfill-strategy](../../skills/trading/data-backfill-strategy/SKILL.md) | Trading | "Provides Strategic data backfill for populating historical... | Implementation |
| [data-candle-data](../../skills/trading/data-candle-data/SKILL.md) | Trading | "OHLCV candle data processing, timeframe management, and... | Implementation |
| [data-enrichment](../../skills/trading/data-enrichment/SKILL.md) | Trading | "Provides Data enrichment techniques for adding context to... | Implementation |
| [data-feature-store](../../skills/trading/data-feature-store/SKILL.md) | Trading | "Provides Feature storage and management for machine... | Implementation |
| [data-fetching](../../skills/programming/data-fetching/SKILL.md) | Programming | Provides use when implementing or debugging any network... | Implementation |
| [data-handling](../../skills/coding/data-handling/SKILL.md) | Coding | "Provides Practical implementation guide for GDPR-compliant... | Review |
| [data-lake](../../skills/trading/data-lake/SKILL.md) | Trading | "Provides Data lake architecture and management for trading... | Implementation |
| [data-normalization](../../skills/coding/data-normalization/SKILL.md) | Coding | 'Provides Exchange data normalization layer: typed... | Implementation |
| [data-order-book](../../skills/trading/data-order-book/SKILL.md) | Trading | "Order book data handling, spread calculation, liquidity... | Implementation |
| [data-stream-processing](../../skills/trading/data-stream-processing/SKILL.md) | Trading | "Provides Streaming data processing for real-time trading... | Implementation |
| [data-tables-java](../../skills/cncf/data-tables-java/SKILL.md) | Cncf | "Provides Build table storage applications using the Azure... | Implementation |
| [data-tables-py](../../skills/cncf/data-tables-py/SKILL.md) | Cncf | "Provides Azure Tables SDK for Python (Storage and Cosmos... | Implementation |
| [data-time-series-database](../../skills/trading/data-time-series-database/SKILL.md) | Trading | "Provides Time-series database queries and optimization for... | Implementation |
| [data-transforms](../../skills/programming/data-transforms/SKILL.md) | Programming | Provides Everyday data transformations using functional... | Implementation |
| [data-validation](../../skills/trading/data-validation/SKILL.md) | Trading | "Provides Data validation and quality assurance for trading... | Implementation |
| [database](../../skills/agent/database/SKILL.md) | Agent | Provides Database development and operations workflow... | Implementation |
| [database](../../skills/coding/database/SKILL.md) | Coding | "Provides Direct REST API access to PubMed. Advanced... | Implementation |
| [database](../../skills/coding/database/SKILL.md) | Coding | Provides Direct REST API access to UniProt. Protein... | Implementation |
| [database-engineer](../../skills/programming/database-engineer/SKILL.md) | Programming | Provides Expert in vector databases, embedding strategies,... | Implementation |
| [database-pentesting](../../skills/cncf/database-pentesting/SKILL.md) | Cncf | "Provides Provide systematic methodologies for automated... | Implementation |
| [database-query](../../skills/programming/database-query/SKILL.md) | Programming | Provides food database query functionality and capabilities. | Implementation |
| [dataforseo](../../skills/programming/dataforseo/SKILL.md) | Programming | Provides use dataforseo for live serps, keyword metrics,... | Implementation |
| [debugger](../../skills/coding/debugger/SKILL.md) | Coding | "Debugging specialist for errors, test failures, and... | Implementation |
| [debugger-agent](../../skills/programming/debugger-agent/SKILL.md) | Programming | "Provides Debug the current iOS project on a booted... | Implementation |
| [debugging](../../skills/coding/debugging/SKILL.md) | Coding | "Provides use when encountering any bug, test failure, or... | Implementation |
| [debugging-debug-trace](../../skills/cncf/debugging-debug-trace/SKILL.md) | Cncf | Provides You are a debugging expert specializing in setting... | Implementation |
| [debugging-error-analysis](../../skills/programming/debugging-error-analysis/SKILL.md) | Programming | "Provides You are an expert error analysis specialist with... | Implementation |
| [debugging-error-trace](../../skills/programming/debugging-error-trace/SKILL.md) | Programming | "Provides You are an error tracking and observability... | Implementation |
| [debugging-multi-agent-review](../../skills/programming/debugging-multi-agent-review/SKILL.md) | Programming | "Provides use when working with error debugging multi agent... | Implementation |
| [decision-records](../../skills/coding/decision-records/SKILL.md) | Coding | "Provides Comprehensive patterns for creating, maintaining,... | Implementation |
| [defensive-patterns](../../skills/programming/defensive-patterns/SKILL.md) | Programming | "Provides Master defensive Bash programming techniques for... | Implementation |
| [defuddle](../../skills/programming/defuddle/SKILL.md) | Programming | "Provides Extract clean markdown content from web pages... | Implementation |
| [degradation](../../skills/programming/degradation/SKILL.md) | Programming | Provides Language models exhibit predictable degradation... | Implementation |
| [demand-planning](../../skills/programming/demand-planning/SKILL.md) | Programming | "Provides Codified expertise for demand forecasting, safety... | Implementation |
| [dependency-graph-builder](../../skills/agent/dependency-graph-builder/SKILL.md) | Agent | "Builds and maintains dependency graphs for task execution,... | Orchestration |
| [deploy](../../skills/cncf/deploy/SKILL.md) | Cncf | "Provides DevOps e deploy de aplicacoes — Docker, CI/CD com... | Implementation |
| [deployment](../../skills/agent/deployment/SKILL.md) | Agent | Provides Kubernetes deployment workflow for container... | Implementation |
| [deployment](../../skills/cncf/deployment/SKILL.md) | Cncf | Provides Deploy containerized frontend + backend... | Implementation |
| [deployment](../../skills/programming/deployment/SKILL.md) | Programming | Provides deploy expo apps to production functionality and... | Implementation |
| [deployment](../../skills/programming/deployment/SKILL.md) | Programming | "CRITICAL: Use for Makepad packaging and deployment.... | Implementation |
| [deployment](../../skills/programming/deployment/SKILL.md) | Programming | Provides expert knowledge for deploying to vercel with... | Implementation |
| [design](../../skills/cncf/design/SKILL.md) | Cncf | Provides Database design principles and decision-making.... | Implementation |
| [design](../../skills/coding/design/SKILL.md) | Coding | "Provides You are a frontend designer-engineer, not a... | Implementation |
| [design](../../skills/programming/design/SKILL.md) | Programming | "Provides These are instructions for creating design... | Implementation |
| [design](../../skills/programming/design/SKILL.md) | Programming | "Provides Game design principles. GDD structure, balancing,... | Implementation |
| [design](../../skills/programming/design/SKILL.md) | Programming | "Provides (mobile-first · touch-first ·... | Implementation |
| [design](../../skills/programming/design/SKILL.md) | Programming | "Provides Design de produto nivel Apple — sistemas visuais,... | Implementation |
| [design](../../skills/programming/design/SKILL.md) | Programming | Provides Build tools that agents can use effectively,... | Implementation |
| [design-expert](../../skills/programming/design-expert/SKILL.md) | Programming | "Provides Core UI/UX engineering skill for building highly... | Implementation |
| [design-guidelines](../../skills/programming/design-guidelines/SKILL.md) | Programming | "Provides review files for compliance with web interface... | Implementation |
| [design-principles](../../skills/coding/design-principles/SKILL.md) | Coding | "Provides Master REST and GraphQL API design principles to... | Implementation |
| [design-system](../../skills/programming/design-system/SKILL.md) | Programming | "Provides Build production-ready design systems with... | Implementation |
| [design-taste](../../skills/coding/design-taste/SKILL.md) | Coding | "Provides use when generating google stitch design.md... | Implementation |
| [detective](../../skills/programming/detective/SKILL.md) | Programming | "Provides Search logs and codebases for error patterns,... | Implementation |
| [dev](../../skills/agent/dev/SKILL.md) | Agent | "Provides Trigger.dev expert for background jobs, AI... | Orchestration |
| [dev-client](../../skills/programming/dev-client/SKILL.md) | Programming | "Provides Build and distribute Expo development clients... | Implementation |
| [dev-guidelines](../../skills/coding/dev-guidelines/SKILL.md) | Coding | "Provides You are a senior backend engineer operating... | Implementation |
| [dev-guidelines](../../skills/coding/dev-guidelines/SKILL.md) | Coding | "Provides You are a senior frontend engineer operating... | Implementation |
| [dev-jobs-mcp](../../skills/agent/dev-jobs-mcp/SKILL.md) | Agent | "Provides Search 8,400+ AI and ML jobs across 489... | Implementation |
| [developer](../../skills/agent/developer/SKILL.md) | Agent | "Provides Comprehensive guide for creating and managing... | Implementation |
| [developer](../../skills/coding/developer/SKILL.md) | Coding | "Provides Build React components, implement responsive... | Implementation |
| [developer](../../skills/programming/developer/SKILL.md) | Programming | "Provides Build production-ready Web3 applications, smart... | Implementation |
| [developer](../../skills/programming/developer/SKILL.md) | Programming | Provides Develop native iOS applications with... | Implementation |
| [developer](../../skills/programming/developer/SKILL.md) | Programming | "Provides Develop React Native, Flutter, or native mobile... | Implementation |
| [developer](../../skills/programming/developer/SKILL.md) | Programming | "Provides Build Unity games with optimized C# scripts,... | Implementation |
| [development](../../skills/agent/development/SKILL.md) | Agent | "Provides Comprehensive web, mobile, and backend... | Implementation |
| [development](../../skills/cncf/development/SKILL.md) | Cncf | "Provides Expert patterns for Salesforce platform... | Implementation |
| [development](../../skills/cncf/development/SKILL.md) | Cncf | "Provides Build Shopify apps, extensions, themes using... | Implementation |
| [development](../../skills/programming/development/SKILL.md) | Programming | "Provides Fast, modern JavaScript/TypeScript development... | Implementation |
| [development](../../skills/programming/development/SKILL.md) | Programming | "Provides Master Electron desktop app development with... | Implementation |
| [development](../../skills/programming/development/SKILL.md) | Programming | "Provides Game development orchestrator. Routes to... | Implementation |
| [development](../../skills/programming/development/SKILL.md) | Programming | Provides this skill covers the principles for identifying... | Implementation |
| [development](../../skills/programming/development/SKILL.md) | Programming | Provides Comprehensive Snowflake development assistant... | Implementation |
| [development-feature-development](../../skills/coding/development-feature-development/SKILL.md) | Coding | "Provides Orchestrate end-to-end backend feature... | Implementation |
| [development-python-scaffold](../../skills/programming/development-python-scaffold/SKILL.md) | Programming | "Provides You are a Python project architecture expert... | Implementation |
| [devops](../../skills/agent/devops/SKILL.md) | Agent | "Provides Cloud infrastructure and DevOps workflow covering... | Implementation |
| [diagnostics-error-analysis](../../skills/programming/diagnostics-error-analysis/SKILL.md) | Programming | "Provides You are an expert error analysis specialist with... | Implementation |
| [diagnostics-error-trace](../../skills/programming/diagnostics-error-trace/SKILL.md) | Programming | "Provides You are an error tracking and observability... | Implementation |
| [diagnostics-smart-debug](../../skills/programming/diagnostics-smart-debug/SKILL.md) | Programming | "Provides use when working with error diagnostics smart... | Implementation |
| [diary](../../skills/agent/diary/SKILL.md) | Agent | 'Provides Unified Diary System: A context-preserving... | Implementation |
| [diff-quality-analyzer](../../skills/agent/diff-quality-analyzer/SKILL.md) | Agent | "Analyzes code quality changes in diffs by evaluating... | Analysis |
| [directory-attacks](../../skills/coding/directory-attacks/SKILL.md) | Coding | "Provides Provide comprehensive techniques for attacking... | Review |
| [docker-deployment](../../skills/programming/docker-deployment/SKILL.md) | Programming | Provides Production-ready Docker and docker-compose setup... | Implementation |
| [docs-automation](../../skills/agent/docs-automation/SKILL.md) | Agent | Provides Lightweight Google Docs integration with... | Implementation |
| [documentation](../../skills/agent/documentation/SKILL.md) | Agent | "Provides API documentation workflow for generating OpenAPI... | Implementation |
| [documentation](../../skills/agent/documentation/SKILL.md) | Agent | "Provides Documentation generation workflow covering API... | Implementation |
| [documentation-code-explain](../../skills/programming/documentation-code-explain/SKILL.md) | Programming | "Provides You are a code education expert specializing in... | Implementation |
| [documentation-doc-generate](../../skills/programming/documentation-doc-generate/SKILL.md) | Programming | "Provides You are a documentation expert specializing in... | Implementation |
| [documentation-generator](../../skills/coding/documentation-generator/SKILL.md) | Coding | "Provides Generate comprehensive, developer-friendly API... | Implementation |
| [documenter](../../skills/coding/documenter/SKILL.md) | Coding | "Provides Master API documentation with OpenAPI 3.1,... | Implementation |
| [dragonfly](../../skills/cncf/dragonfly/SKILL.md) | Cncf | "Provides Dragonfly in Cloud-Native Engineering - P2P file... | Reference |
| [draw](../../skills/programming/draw/SKILL.md) | Programming | "Provides Vector graphics and diagram creation, format... | Implementation |
| [drive-automation](../../skills/agent/drive-automation/SKILL.md) | Agent | Provides Lightweight Google Drive integration with... | Implementation |
| [drive-automation](../../skills/programming/drive-automation/SKILL.md) | Programming | "Provides Automate OneDrive file management, search,... | Implementation |
| [driven-design](../../skills/coding/driven-design/SKILL.md) | Coding | "Provides Plan and route Domain-Driven Design work from... | Implementation |
| [driven-development](../../skills/agent/driven-development/SKILL.md) | Agent | "Provides use when executing implementation plans with... | Orchestration |
| [driven-development](../../skills/programming/driven-development/SKILL.md) | Programming | Provides Guide for implementing and maintaining context as... | Implementation |
| [ds-ab-testing](../../skills/coding/ds-ab-testing/SKILL.md) | Coding | Provides Designs and analyzes A/B tests including... | Implementation |
| [ds-anomaly-detection](../../skills/coding/ds-anomaly-detection/SKILL.md) | Coding | "Detects anomalies and outliers using isolation forests,... | Implementation |
| [ds-association-rules](../../skills/coding/ds-association-rules/SKILL.md) | Coding | "Provides Discovers association rules and frequent itemsets... | Implementation |
| [ds-bayesian-inference](../../skills/coding/ds-bayesian-inference/SKILL.md) | Coding | "Applies Bayesian methods for prior selection, posterior... | Implementation |
| [ds-bias-variance-tradeoff](../../skills/coding/ds-bias-variance-tradeoff/SKILL.md) | Coding | "Analyzes bias-variance tradeoff, overfitting,... | Implementation |
| [ds-categorical-encoding](../../skills/coding/ds-categorical-encoding/SKILL.md) | Coding | "Provides Encodes categorical variables using one-hot... | Implementation |
| [ds-causal-inference](../../skills/coding/ds-causal-inference/SKILL.md) | Coding | Implements causal models, directed acyclic graphs (DAGs),... | Implementation |
| [ds-classification-metrics](../../skills/coding/ds-classification-metrics/SKILL.md) | Coding | "Evaluates classification models using precision, recall,... | Implementation |
| [ds-clustering](../../skills/coding/ds-clustering/SKILL.md) | Coding | "Implements clustering algorithms including K-means,... | Implementation |
| [ds-community-detection](../../skills/coding/ds-community-detection/SKILL.md) | Coding | "Detects communities and clusters in graphs using... | Implementation |
| [ds-confidence-intervals](../../skills/coding/ds-confidence-intervals/SKILL.md) | Coding | "Provides Constructs confidence intervals using bootstrap,... | Implementation |
| [ds-correlation-analysis](../../skills/coding/ds-correlation-analysis/SKILL.md) | Coding | "Analyzes correlation, covariance, and multivariate... | Implementation |
| [ds-cross-validation](../../skills/coding/ds-cross-validation/SKILL.md) | Coding | "Implements k-fold cross-validation, stratified... | Implementation |
| [ds-data-collection](../../skills/coding/ds-data-collection/SKILL.md) | Coding | "Implements data gathering strategies including APIs, web... | Implementation |
| [ds-data-ingestion](../../skills/coding/ds-data-ingestion/SKILL.md) | Coding | "Provides Designs and implements ETL pipelines, streaming... | Implementation |
| [ds-data-privacy](../../skills/coding/ds-data-privacy/SKILL.md) | Coding | "Applies privacy-preserving techniques including... | Implementation |
| [ds-data-profiling](../../skills/coding/ds-data-profiling/SKILL.md) | Coding | Provides Extracts data profiles, schemas, metadata, and... | Implementation |
| [ds-data-quality](../../skills/coding/ds-data-quality/SKILL.md) | Coding | "Implements data validation, cleaning, outlier detection,... | Implementation |
| [ds-data-versioning](../../skills/coding/ds-data-versioning/SKILL.md) | Coding | "Implements data versioning, lineage tracking, provenance... | Implementation |
| [ds-data-visualization](../../skills/coding/ds-data-visualization/SKILL.md) | Coding | "Creates effective visualizations including plots, charts,... | Implementation |
| [ds-dimensionality-reduction](../../skills/coding/ds-dimensionality-reduction/SKILL.md) | Coding | "Provides Reduces data dimensionality using PCA, t-SNE,... | Implementation |
| [ds-distribution-fitting](../../skills/coding/ds-distribution-fitting/SKILL.md) | Coding | "Provides Fits statistical distributions to data using... | Implementation |
| [ds-eda](../../skills/coding/ds-eda/SKILL.md) | Coding | "Provides Performs exploratory data analysis using summary... | Implementation |
| [ds-ensemble-methods](../../skills/coding/ds-ensemble-methods/SKILL.md) | Coding | "Provides Combines multiple models using bagging, boosting,... | Implementation |
| [ds-experimental-design](../../skills/coding/ds-experimental-design/SKILL.md) | Coding | "Provides Designs experiments using design of experiments... | Implementation |
| [ds-explainability](../../skills/coding/ds-explainability/SKILL.md) | Coding | "Implements explainability and interpretability techniques... | Implementation |
| [ds-feature-engineering](../../skills/coding/ds-feature-engineering/SKILL.md) | Coding | "Creates and transforms features including polynomial... | Implementation |
| [ds-feature-interaction](../../skills/coding/ds-feature-interaction/SKILL.md) | Coding | "Provides Discovers and engineers feature interactions... | Implementation |
| [ds-feature-scaling-normalization](../../skills/coding/ds-feature-scaling-normalization/SKILL.md) | Coding | "Provides Scales and normalizes features using... | Implementation |
| [ds-feature-selection](../../skills/coding/ds-feature-selection/SKILL.md) | Coding | "Selects relevant features using univariate selection,... | Implementation |
| [ds-hyperparameter-tuning](../../skills/coding/ds-hyperparameter-tuning/SKILL.md) | Coding | "Optimizes hyperparameters using grid search, random... | Implementation |
| [ds-hypothesis-testing](../../skills/coding/ds-hypothesis-testing/SKILL.md) | Coding | Implements hypothesis testing including t-tests, chi-square... | Implementation |
| [ds-instrumental-variables](../../skills/coding/ds-instrumental-variables/SKILL.md) | Coding | "Provides Uses instrumental variables (IV), two-stage least... | Implementation |
| [ds-intervention-analysis](../../skills/coding/ds-intervention-analysis/SKILL.md) | Coding | "Provides Estimates treatment effects, conditional average... | Implementation |
| [ds-kernel-density](../../skills/coding/ds-kernel-density/SKILL.md) | Coding | "Implements kernel density estimation, non-parametric... | Implementation |
| [ds-linear-regression](../../skills/coding/ds-linear-regression/SKILL.md) | Coding | "Implements linear regression including OLS, ridge... | Implementation |
| [ds-logistic-regression](../../skills/coding/ds-logistic-regression/SKILL.md) | Coding | "Implements logistic regression for binary and multinomial... | Implementation |
| [ds-maximum-likelihood](../../skills/coding/ds-maximum-likelihood/SKILL.md) | Coding | Implements maximum likelihood estimation, likelihood... | Implementation |
| [ds-metrics-and-kpis](../../skills/coding/ds-metrics-and-kpis/SKILL.md) | Coding | "Defines, selects, and monitors key performance indicators... | Implementation |
| [ds-missing-data](../../skills/coding/ds-missing-data/SKILL.md) | Coding | "Handles missing data using imputation strategies, deletion... | Implementation |
| [ds-model-fairness](../../skills/coding/ds-model-fairness/SKILL.md) | Coding | "Evaluates and mitigates fairness issues including bias... | Implementation |
| [ds-model-interpretation](../../skills/coding/ds-model-interpretation/SKILL.md) | Coding | "Provides Interprets models using SHAP values, LIME,... | Implementation |
| [ds-model-robustness](../../skills/coding/ds-model-robustness/SKILL.md) | Coding | Improves model robustness including adversarial robustness,... | Implementation |
| [ds-model-selection](../../skills/coding/ds-model-selection/SKILL.md) | Coding | "Provides Compares and selects models using AIC, BIC,... | Implementation |
| [ds-monte-carlo](../../skills/coding/ds-monte-carlo/SKILL.md) | Coding | "Implements Monte Carlo sampling, simulation methods, and... | Implementation |
| [ds-neural-networks](../../skills/coding/ds-neural-networks/SKILL.md) | Coding | "Implements deep neural networks, backpropagation,... | Implementation |
| [ds-observational-studies](../../skills/coding/ds-observational-studies/SKILL.md) | Coding | "Analyzes observational data using matching methods,... | Implementation |
| [ds-online-experiments](../../skills/coding/ds-online-experiments/SKILL.md) | Coding | "Implements multi-armed bandits, contextual bandits,... | Implementation |
| [ds-privacy-ml](../../skills/coding/ds-privacy-ml/SKILL.md) | Coding | "Implements privacy-preserving machine learning including... | Implementation |
| [ds-randomized-experiments](../../skills/coding/ds-randomized-experiments/SKILL.md) | Coding | "Provides Designs and analyzes randomized controlled trials... | Implementation |
| [ds-regression-evaluation](../../skills/coding/ds-regression-evaluation/SKILL.md) | Coding | "Evaluates regression models using MSE, RMSE, MAE, MAPE,... | Implementation |
| [ds-reproducible-research](../../skills/coding/ds-reproducible-research/SKILL.md) | Coding | "Implements reproducible research practices including code... | Implementation |
| [ds-statistical-power](../../skills/coding/ds-statistical-power/SKILL.md) | Coding | "Analyzes statistical power, sample size determination,... | Implementation |
| [ds-support-vector-machines](../../skills/coding/ds-support-vector-machines/SKILL.md) | Coding | "Implements support vector machines (SVM) with kernel... | Implementation |
| [ds-synthetic-control](../../skills/coding/ds-synthetic-control/SKILL.md) | Coding | "Implements synthetic control methods,... | Implementation |
| [ds-time-series-forecasting](../../skills/coding/ds-time-series-forecasting/SKILL.md) | Coding | "Implements ARIMA, exponential smoothing, state-space... | Implementation |
| [ds-topic-modeling](../../skills/coding/ds-topic-modeling/SKILL.md) | Coding | "Implements topic modeling using Latent Dirichlet... | Implementation |
| [ds-tree-methods](../../skills/coding/ds-tree-methods/SKILL.md) | Coding | "Implements decision trees, random forests, gradient... | Implementation |
| [dsl](../../skills/programming/dsl/SKILL.md) | Programming | "CRITICAL: Use for Makepad DSL syntax and inheritance.... | Implementation |
| [dynamic-replanner](../../skills/agent/dynamic-replanner/SKILL.md) | Agent | "Dynamically adjusts execution plans based on real-time... | Orchestration |
| [e2e-testing](../../skills/coding/e2e-testing/SKILL.md) | Coding | "Provides AI-powered E2E web testing — eyes and hands for... | Review |
| [ecommerce](../../skills/agent/ecommerce/SKILL.md) | Agent | Provides Extract product data, prices, reviews, and seller... | Implementation |
| [ecommerce-configurator](../../skills/programming/ecommerce-configurator/SKILL.md) | Programming | 'Provides Expert guide for Odoo eCommerce and Website:... | Implementation |
| [ecs-expert](../../skills/programming/ecs-expert/SKILL.md) | Programming | Provides Master Bevy's Entity Component System (ECS) in... | Implementation |
| [ecs-patterns](../../skills/programming/ecs-patterns/SKILL.md) | Programming | Provides Production patterns for Unity's Data-Oriented... | Implementation |
| [edges](../../skills/programming/edges/SKILL.md) | Programming | "Provides sharp-edges functionality and capabilities." | Implementation |
| [edi-connector](../../skills/programming/edi-connector/SKILL.md) | Programming | 'Provides Guide for implementing EDI (Electronic Data... | Implementation |
| [edital](../../skills/programming/edital/SKILL.md) | Programming | "Provides Analise e auditoria de editais de leilao judicial... | Implementation |
| [editing](../../skills/programming/editing/SKILL.md) | Programming | "Provides You are an expert copy editor specializing in... | Implementation |
| [either-ref](../../skills/programming/either-ref/SKILL.md) | Programming | "Provides Quick reference for Either type. Use when user... | Implementation |
| [elite](../../skills/programming/elite/SKILL.md) | Programming | "Provides Senior Elite Software Engineer (15+) and Senior... | Implementation |
| [elite-gemini-high](../../skills/programming/elite-gemini-high/SKILL.md) | Programming | "Provides Modo Elite Coder + UX Pixel-Perfect otimizado... | Implementation |
| [email](../../skills/programming/email/SKILL.md) | Programming | "Provides Write B2B cold emails and follow-up sequences... | Implementation |
| [emissary-ingress](../../skills/cncf/emissary-ingress/SKILL.md) | Cncf | "Provides Emissary-Ingress in Cloud-Native Engineering -... | Reference |
| [emotion-engineer](../../skills/programming/emotion-engineer/SKILL.md) | Programming | "Provides one sentence - what this skill does and when to... | Implementation |
| [enablement](../../skills/programming/enablement/SKILL.md) | Programming | "Provides Create sales collateral such as decks,... | Implementation |
| [end-visual-design](../../skills/coding/end-visual-design/SKILL.md) | Coding | "Provides use when designing expensive agency-grade... | Implementation |
| [endpoint-builder](../../skills/programming/endpoint-builder/SKILL.md) | Programming | "Builds production-ready REST API endpoints with... | Implementation |
| [engine](../../skills/programming/engine/SKILL.md) | Programming | "Provides Motor de crescimento para produtos digitais --... | Implementation |
| [engine-cpp-pro](../../skills/coding/engine-cpp-pro/SKILL.md) | Coding | "Provides Expert guide for Unreal Engine 5.x C++... | Implementation |
| [engineer](../../skills/agent/engineer/SKILL.md) | Agent | Transforms user prompts into optimized prompts using... | Implementation |
| [engineer](../../skills/cncf/engineer/SKILL.md) | Cncf | Provides Expert deployment engineer specializing in modern... | Implementation |
| [engineer](../../skills/cncf/engineer/SKILL.md) | Cncf | Provides Build production-ready monitoring, logging, and... | Implementation |
| [engineer](../../skills/coding/engineer/SKILL.md) | Coding | "Provides Expert reverse engineer specializing in binary... | Review |
| [engineer](../../skills/programming/engineer/SKILL.md) | Programming | Provides Build production-ready LLM applications, advanced... | Implementation |
| [engineer](../../skills/programming/engineer/SKILL.md) | Programming | Provides Build scalable data pipelines, modern data... | Implementation |
| [engineer](../../skills/programming/engineer/SKILL.md) | Programming | Provides Build production ML systems with PyTorch 2.x,... | Implementation |
| [engineer](../../skills/programming/engineer/SKILL.md) | Programming | Provides Build comprehensive ML pipelines, experiment... | Implementation |
| [engineer](../../skills/programming/engineer/SKILL.md) | Programming | "Provides Expert network engineer specializing in modern... | Implementation |
| [engineer](../../skills/programming/engineer/SKILL.md) | Programming | Provides Expert performance engineer specializing in modern... | Implementation |
| [engineer](../../skills/programming/engineer/SKILL.md) | Programming | Provides Expert in building Retrieval-Augmented Generation... | Implementation |
| [engineer](../../skills/programming/engineer/SKILL.md) | Programming | "Creates step-by-step tutorials and educational content... | Implementation |
| [engineering](../../skills/programming/engineering/SKILL.md) | Programming | Provides Expert guide on prompt engineering patterns, best... | Implementation |
| [engineering-data-driven-feature](../../skills/programming/engineering-data-driven-feature/SKILL.md) | Programming | "Provides Build features guided by data insights, A/B... | Implementation |
| [engineering-data-pipeline](../../skills/programming/engineering-data-pipeline/SKILL.md) | Programming | Provides You are a data pipeline architecture expert... | Implementation |
| [engineering-patterns](../../skills/programming/engineering-patterns/SKILL.md) | Programming | Provides Master advanced prompt engineering techniques to... | Implementation |
| [engineering-toolkit](../../skills/programming/engineering-toolkit/SKILL.md) | Programming | 'Provides 6 production-ready AI engineering workflows:... | Implementation |
| [envoy](../../skills/cncf/envoy/SKILL.md) | Cncf | "Envoy in Cloud-Native Engineering - Cloud-native... | Reference |
| [error-trace-explainer](../../skills/agent/error-trace-explainer/SKILL.md) | Agent | "Explains error traces and exceptions by analyzing stack... | Diagnosis |
| [errors](../../skills/programming/errors/SKILL.md) | Programming | "Provides Stop throwing everywhere - handle errors as... | Implementation |
| [escalation-methods](../../skills/coding/escalation-methods/SKILL.md) | Coding | "Provides Provide comprehensive techniques for escalating... | Review |
| [especialista](../../skills/programming/especialista/SKILL.md) | Programming | 'Provides Advogado especialista em todas as areas do... | Implementation |
| [estimation](../../skills/programming/estimation/SKILL.md) | Programming | "Provides Estimate AI-assisted and hybrid human+agent... | Implementation |
| [etcd](../../skills/cncf/etcd/SKILL.md) | Cncf | "Provides etcd in Cloud-Native Engineering - distributed... | Reference |
| [evaluation](../../skills/agent/evaluation/SKILL.md) | Agent | "Provides Testing and benchmarking LLM agents including... | Implementation |
| [evaluation](../../skills/programming/evaluation/SKILL.md) | Programming | Provides this skill should be used when the user asks to... | Implementation |
| [evaluation](../../skills/programming/evaluation/SKILL.md) | Programming | Provides Build evaluation frameworks for agent systems. Use... | Implementation |
| [evaluation](../../skills/programming/evaluation/SKILL.md) | Programming | Provides Master comprehensive evaluation strategies for LLM... | Implementation |
| [event-action](../../skills/programming/event-action/SKILL.md) | Programming | "CRITICAL: Use for Makepad event and action handling.... | Implementation |
| [event-action](../../skills/programming/event-action/SKILL.md) | Programming | "CRITICAL: Use for Robius event and action patterns.... | Implementation |
| [event-bus](../../skills/coding/event-bus/SKILL.md) | Coding | "Async pub/sub event bus with typed events, mixed... | Implementation |
| [event-driven-architecture](../../skills/coding/event-driven-architecture/SKILL.md) | Coding | "'Event-driven architecture for real-time trading systems:... | Implementation |
| [eventgrid-dotnet](../../skills/cncf/eventgrid-dotnet/SKILL.md) | Cncf | "Provides Azure Event Grid SDK for .NET. Client library for... | Implementation |
| [eventgrid-java](../../skills/cncf/eventgrid-java/SKILL.md) | Cncf | "Provides Build event-driven applications with Azure Event... | Implementation |
| [eventgrid-py](../../skills/cncf/eventgrid-py/SKILL.md) | Cncf | "Provides Azure Event Grid SDK for Python. Use for... | Implementation |
| [eventhub-dotnet](../../skills/cncf/eventhub-dotnet/SKILL.md) | Cncf | "Configures azure event hubs sdk for .net for cloud-native... | Implementation |
| [eventhub-java](../../skills/cncf/eventhub-java/SKILL.md) | Cncf | Provides Build real-time streaming applications with Azure... | Implementation |
| [eventhub-py](../../skills/cncf/eventhub-py/SKILL.md) | Cncf | "Provides Azure Event Hubs SDK for Python streaming. Use... | Implementation |
| [eventhub-rust](../../skills/cncf/eventhub-rust/SKILL.md) | Cncf | Provides Azure Event Hubs SDK for Rust. Use for sending and... | Implementation |
| [eventhub-ts](../../skills/cncf/eventhub-ts/SKILL.md) | Cncf | Provides High-throughput event streaming and real-time data... | Implementation |
| [evolution](../../skills/programming/evolution/SKILL.md) | Programming | "Provides this skill enables makepad-skills to self-improve... | Implementation |
| [exception-management](../../skills/programming/exception-management/SKILL.md) | Programming | "Provides Codified expertise for handling freight... | Implementation |
| [exchange-ccxt-patterns](../../skills/trading/exchange-ccxt-patterns/SKILL.md) | Trading | "Effective patterns for using CCXT library for exchange... | Implementation |
| [exchange-failover-handling](../../skills/trading/exchange-failover-handling/SKILL.md) | Trading | "Provides Automated failover and redundancy management for... | Implementation |
| [exchange-health](../../skills/trading/exchange-health/SKILL.md) | Trading | "Provides Exchange system health monitoring and... | Implementation |
| [exchange-market-data-cache](../../skills/trading/exchange-market-data-cache/SKILL.md) | Trading | "High-performance caching layer for market data with low... | Implementation |
| [exchange-order-book-sync](../../skills/trading/exchange-order-book-sync/SKILL.md) | Trading | "Provides Order book synchronization and state management... | Implementation |
| [exchange-order-execution-api](../../skills/trading/exchange-order-execution-api/SKILL.md) | Trading | "Implements order execution and management api for trading... | Implementation |
| [exchange-rate-limiting](../../skills/trading/exchange-rate-limiting/SKILL.md) | Trading | "Rate Limiting Strategies and Circuit Breaker Patterns for... | Implementation |
| [exchange-trade-reporting](../../skills/trading/exchange-trade-reporting/SKILL.md) | Trading | "Real-time trade reporting and execution analytics for... | Implementation |
| [exchange-websocket-handling](../../skills/trading/exchange-websocket-handling/SKILL.md) | Trading | "Real-time market data handling with WebSockets including... | Implementation |
| [exchange-websocket-streaming](../../skills/trading/exchange-websocket-streaming/SKILL.md) | Trading | "Implements real-time market data streaming and processing... | Implementation |
| [execution-order-book-impact](../../skills/trading/execution-order-book-impact/SKILL.md) | Trading | "Provides Order Book Impact Measurement and Market... | Implementation |
| [execution-rate-limiting](../../skills/trading/execution-rate-limiting/SKILL.md) | Trading | "Provides Rate Limiting and Exchange API Management for... | Implementation |
| [execution-slippage-modeling](../../skills/trading/execution-slippage-modeling/SKILL.md) | Trading | "Slippage Estimation, Simulation, and Fee Modeling for... | Implementation |
| [execution-twap](../../skills/trading/execution-twap/SKILL.md) | Trading | "Time-Weighted Average Price algorithm for executing large... | Implementation |
| [execution-twap-vwap](../../skills/trading/execution-twap-vwap/SKILL.md) | Trading | 'Provides ''TWAP and VWAP Execution Algorithms:... | Implementation |
| [execution-vwap](../../skills/trading/execution-vwap/SKILL.md) | Trading | "Volume-Weighted Average Price algorithm for executing... | Implementation |
| [existing-projects](../../skills/coding/existing-projects/SKILL.md) | Coding | "Provides use when upgrading existing websites or apps by... | Implementation |
| [experience](../../skills/coding/experience/SKILL.md) | Coding | "Provides Expert in building immersive scroll-driven... | Implementation |
| [expert](../../skills/cncf/expert/SKILL.md) | Cncf | Provides You are an advanced Docker containerization expert... | Implementation |
| [expert](../../skills/cncf/expert/SKILL.md) | Cncf | Provides Expert guidance for distributed NoSQL databases... | Implementation |
| [expert](../../skills/cncf/expert/SKILL.md) | Cncf | Provides You are an expert in Prisma ORM with deep... | Implementation |
| [expert](../../skills/coding/expert/SKILL.md) | Coding | "Provides Advanced .faf (Foundational AI-context Format)... | Implementation |
| [expert](../../skills/coding/expert/SKILL.md) | Coding | "Provides Senior Laravel Engineer role for... | Implementation |
| [expert](../../skills/coding/expert/SKILL.md) | Coding | "Provides You are an expert in Nest.js with deep knowledge... | Implementation |
| [expert](../../skills/coding/expert/SKILL.md) | Coding | "Provides TypeScript and JavaScript expert with deep... | Implementation |
| [expert](../../skills/programming/expert/SKILL.md) | Programming | "Provides expertise for analyzing DWARF debug files and... | Implementation |
| [expert](../../skills/programming/expert/SKILL.md) | Programming | "Provides Master Flutter development with Dart 3, advanced... | Implementation |
| [expert](../../skills/programming/expert/SKILL.md) | Programming | "Provides Expert advisor for ITIL 4 and ITIL 5 (2026... | Implementation |
| [expert](../../skills/programming/expert/SKILL.md) | Programming | "Provides Create Mermaid diagrams for flowcharts,... | Implementation |
| [expert-skill](../../skills/programming/expert-skill/SKILL.md) | Programming | "Provides Write, review, or improve SwiftUI code following... | Implementation |
| [expo](../../skills/programming/expo/SKILL.md) | Programming | "Provides upgrade expo sdk versions functionality and... | Implementation |
| [express-wrapper](../../skills/coding/express-wrapper/SKILL.md) | Coding | "Provides Wrapper oficial de M2MCent (Node.js) para... | Implementation |
| [expression-syntax](../../skills/agent/expression-syntax/SKILL.md) | Agent | Provides Validate n8n expression syntax and fix common... | Implementation |
| [extension-builder](../../skills/programming/extension-builder/SKILL.md) | Programming | "Provides Expert in building browser extensions that solve... | Implementation |
| [extension-developer](../../skills/coding/extension-developer/SKILL.md) | Coding | "Provides Expert in building Chrome Extensions using... | Implementation |
| [extension-guide-en](../../skills/programming/extension-guide-en/SKILL.md) | Programming | "Provides Guide for VS Code extension development from... | Implementation |
| [external-api-development](../../skills/cncf/external-api-development/SKILL.md) | Cncf | "Provides this skill guides you through creating custom... | Implementation |
| [extractor](../../skills/programming/extractor/SKILL.md) | Programming | "Extracts up to 50 highly relevant SEO keywords from text.... | Implementation |
| [face-cli](../../skills/programming/face-cli/SKILL.md) | Programming | Provides use the hugging face hub cli (`hf`) to download,... | Implementation |
| [face-community-evals](../../skills/programming/face-community-evals/SKILL.md) | Programming | Provides Run local evaluations for Hugging Face Hub models... | Implementation |
| [face-dataset-viewer](../../skills/programming/face-dataset-viewer/SKILL.md) | Programming | Provides Query Hugging Face datasets through the Dataset... | Implementation |
| [face-datasets](../../skills/programming/face-datasets/SKILL.md) | Programming | Provides Create and manage datasets on Hugging Face Hub.... | Implementation |
| [face-evaluation](../../skills/programming/face-evaluation/SKILL.md) | Programming | Provides Add and manage evaluation results in Hugging Face... | Implementation |
| [face-gradio](../../skills/programming/face-gradio/SKILL.md) | Programming | Provides Build or edit Gradio apps, layouts, components,... | Implementation |
| [face-jobs](../../skills/programming/face-jobs/SKILL.md) | Programming | Provides Run workloads on Hugging Face Jobs with managed... | Implementation |
| [face-model-trainer](../../skills/programming/face-model-trainer/SKILL.md) | Programming | Provides Train or fine-tune TRL language models on Hugging... | Implementation |
| [face-paper-publisher](../../skills/programming/face-paper-publisher/SKILL.md) | Programming | Provides Publish and manage research papers on Hugging Face... | Implementation |
| [face-papers](../../skills/programming/face-papers/SKILL.md) | Programming | Provides Read and analyze Hugging Face paper pages or arXiv... | Implementation |
| [face-tool-builder](../../skills/programming/face-tool-builder/SKILL.md) | Programming | Provides Your purpose is now is to create reusable command... | Implementation |
| [face-trackio](../../skills/programming/face-trackio/SKILL.md) | Programming | Provides Track ML experiments with Trackio using Python... | Implementation |
| [face-vision-trainer](../../skills/programming/face-vision-trainer/SKILL.md) | Programming | Provides Train or fine-tune vision models on Hugging Face... | Implementation |
| [factory](../../skills/programming/factory/SKILL.md) | Programming | "Provides this skill provides a curated collection of... | Implementation |
| [factory-explainer](../../skills/programming/factory-explainer/SKILL.md) | Programming | "Provides Explain Bitcoin Lightning channel factories and... | Implementation |
| [failure-mode-analysis](../../skills/agent/failure-mode-analysis/SKILL.md) | Agent | "Performs failure mode analysis by identifying potential... | Reliability |
| [falco](../../skills/cncf/falco/SKILL.md) | Cncf | "Provides Falco in Cloud-Native Engineering - Cloud Native... | Reference |
| [fastapi-development](../../skills/agent/fastapi-development/SKILL.md) | Agent | "Provides Python FastAPI backend development with async... | Implementation |
| [fastapi-patterns](../../skills/coding/fastapi-patterns/SKILL.md) | Coding | "FastAPI application structure with typed error hierarchy,... | Implementation |
| [favicon](../../skills/programming/favicon/SKILL.md) | Programming | "Provides generate favicons from a source image... | Implementation |
| [feedback](../../skills/programming/feedback/SKILL.md) | Programming | "Provides Add loading, empty, error, and success feedback... | Implementation |
| [financial-modeling](../../skills/programming/financial-modeling/SKILL.md) | Programming | "Provides Build comprehensive 3-5 year financial models... | Implementation |
| [fintech](../../skills/cncf/fintech/SKILL.md) | Cncf | "Provides Expert patterns for Plaid API integration... | Implementation |
| [firebase](../../skills/cncf/firebase/SKILL.md) | Cncf | "Provides Firebase gives you a complete backend in minutes... | Implementation |
| [fixing](../../skills/coding/fixing/SKILL.md) | Coding | "Provides Systematically identify and fix all failing tests... | Implementation |
| [flatcar-container-linux](../../skills/cncf/flatcar-container-linux/SKILL.md) | Cncf | "Provides Flatcar Container Linux in Cloud-Native... | Reference |
| [flow](../../skills/programming/flow/SKILL.md) | Programming | "Provides Design user flows and screen structure using... | Implementation |
| [flow-architect](../../skills/programming/flow-architect/SKILL.md) | Programming | "Provides Build production-ready ReactFlow applications... | Implementation |
| [flow-cro](../../skills/programming/flow-cro/SKILL.md) | Programming | "Provides You are an expert in optimizing signup and... | Implementation |
| [flow-node-ts](../../skills/programming/flow-node-ts/SKILL.md) | Programming | "Provides Create React Flow node components following... | Implementation |
| [fluentd](../../skills/cncf/fluentd/SKILL.md) | Cncf | "Fluentd unified logging layer for collecting,... | Reference |
| [fluid](../../skills/cncf/fluid/SKILL.md) | Cncf | "Fluid in A Kubernetes-native data acceleration layer for... | Reference |
| [flux](../../skills/cncf/flux/SKILL.md) | Cncf | "Configures flux in cloud-native engineering - gitops for... | Reference |
| [font](../../skills/programming/font/SKILL.md) | Programming | "CRITICAL: Use for Makepad font and text rendering.... | Implementation |
| [food-safety-auditor](../../skills/programming/food-safety-auditor/SKILL.md) | Programming | "Provides Expert AI auditor for FDA Food Safety (FSMA),... | Implementation |
| [forensic-incident-response](../../skills/programming/forensic-incident-response/SKILL.md) | Programming | "Provides Investigate sudden drops in organic traffic or... | Implementation |
| [forensics](../../skills/coding/forensics/SKILL.md) | Coding | "Provides Comprehensive techniques for acquiring,... | Review |
| [foundations](../../skills/programming/foundations/SKILL.md) | Programming | "Provides apple human interface guidelines design... | Implementation |
| [framework](../../skills/coding/framework/SKILL.md) | Coding | "Provides ⚠️ AUTHORIZED USE ONLY > This skill is for... | Review |
| [framework-azure-ai-py](../../skills/programming/framework-azure-ai-py/SKILL.md) | Programming | Provides Build persistent agents on Azure AI Foundry using... | Implementation |
| [frameworks](../../skills/programming/frameworks/SKILL.md) | Programming | "Provides Build robust, production-grade backtesting... | Implementation |
| [friday-agent](../../skills/agent/friday-agent/SKILL.md) | Agent | "Provides Build a low-latency, Iron Man-inspired tactical... | Implementation |
| [frontend](../../skills/programming/frontend/SKILL.md) | Programming | "Provides Frontend development skill for React, Next.js,... | Implementation |
| [fullstack](../../skills/coding/fullstack/SKILL.md) | Coding | "Provides Build end-to-end type-safe APIs with tRPC —... | Implementation |
| [fullstack](../../skills/programming/fullstack/SKILL.md) | Programming | "Provides Complete toolkit for senior fullstack with modern... | Implementation |
| [fundamentals](../../skills/programming/fundamentals/SKILL.md) | Programming | Provides Context is the complete state available to a... | Implementation |
| [fundamentals](../../skills/programming/fundamentals/SKILL.md) | Programming | "Provides Generative Engine Optimization for AI search... | Implementation |
| [fundamentals](../../skills/programming/fundamentals/SKILL.md) | Programming | "Provides Core principles of SEO including E-E-A-T, Core... | Implementation |
| [fundamentals](../../skills/programming/fundamentals/SKILL.md) | Programming | "Provides Three.js scene setup, cameras, renderer, Object3D... | Implementation |
| [fundamentals-market-regimes](../../skills/trading/fundamentals-market-regimes/SKILL.md) | Trading | "Market regime detection and adaptation for trading systems... | Implementation |
| [fundamentals-market-structure](../../skills/trading/fundamentals-market-structure/SKILL.md) | Trading | "Implements market structure and trading participants... | Implementation |
| [fundamentals-risk-management-basics](../../skills/trading/fundamentals-risk-management-basics/SKILL.md) | Trading | "Position sizing, stop-loss implementation, and... | Implementation |
| [fundamentals-trading-edge](../../skills/trading/fundamentals-trading-edge/SKILL.md) | Trading | "Provides Finding and maintaining competitive advantage in... | Implementation |
| [fundamentals-trading-plan](../../skills/trading/fundamentals-trading-plan/SKILL.md) | Trading | "Implements trading plan structure and risk management... | Implementation |
| [fundamentals-trading-psychology](../../skills/trading/fundamentals-trading-psychology/SKILL.md) | Trading | "Emotional discipline, cognitive bias awareness, and... | Implementation |
| [fuzzing-bug-bounty](../../skills/coding/fuzzing-bug-bounty/SKILL.md) | Coding | "Provides Provide comprehensive techniques for testing... | Implementation |
| [games](../../skills/programming/games/SKILL.md) | Programming | "Provides 2D game development principles. Sprites,... | Implementation |
| [games](../../skills/programming/games/SKILL.md) | Programming | "Provides 3D game development principles. Rendering,... | Implementation |
| [games](../../skills/programming/games/SKILL.md) | Programming | "Provides Mobile game development principles. Touch input,... | Implementation |
| [games](../../skills/programming/games/SKILL.md) | Programming | "Provides PC and console game development principles.... | Implementation |
| [games](../../skills/programming/games/SKILL.md) | Programming | "Provides Web browser game development principles.... | Implementation |
| [gate](../../skills/programming/gate/SKILL.md) | Programming | Provides Pre-ingestion verification for epistemic quality... | Implementation |
| [gated-debugging](../../skills/programming/gated-debugging/SKILL.md) | Programming | "Provides use when debugging any bug. enforces a 5-phase... | Implementation |
| [gates](../../skills/programming/gates/SKILL.md) | Programming | "Provides Agente que simula Bill Gates — cofundador da... | Implementation |
| [gateway](../../skills/coding/gateway/SKILL.md) | Coding | "Provides REST API gateway for ComfyUI servers. Workflow... | Implementation |
| [gcp-autoscaling](../../skills/cncf/gcp-autoscaling/SKILL.md) | Cncf | "Provides Automatically scales compute resources based on... | Reference |
| [gcp-cloud-cdn](../../skills/cncf/gcp-cloud-cdn/SKILL.md) | Cncf | Provides Content delivery network for caching and globally... | Reference |
| [gcp-cloud-dns](../../skills/cncf/gcp-cloud-dns/SKILL.md) | Cncf | Manages DNS with health checks, traffic routing, and... | Reference |
| [gcp-cloud-functions](../../skills/cncf/gcp-cloud-functions/SKILL.md) | Cncf | Deploys serverless functions triggered by events with... | Reference |
| [gcp-cloud-kms](../../skills/cncf/gcp-cloud-kms/SKILL.md) | Cncf | "Manages encryption keys for data protection with automated... | Reference |
| [gcp-cloud-load-balancing](../../skills/cncf/gcp-cloud-load-balancing/SKILL.md) | Cncf | "Provides Distributes traffic across instances with... | Reference |
| [gcp-cloud-monitoring](../../skills/cncf/gcp-cloud-monitoring/SKILL.md) | Cncf | "Monitors GCP resources with metrics, logging, and alerting... | Reference |
| [gcp-cloud-operations](../../skills/cncf/gcp-cloud-operations/SKILL.md) | Cncf | "Provides Systems management including monitoring, logging,... | Reference |
| [gcp-cloud-pubsub](../../skills/cncf/gcp-cloud-pubsub/SKILL.md) | Cncf | "Asynchronous messaging service for event streaming and... | Reference |
| [gcp-cloud-sql](../../skills/cncf/gcp-cloud-sql/SKILL.md) | Cncf | "Provides managed relational databases (MySQL, PostgreSQL)... | Reference |
| [gcp-cloud-storage](../../skills/cncf/gcp-cloud-storage/SKILL.md) | Cncf | "Provides Stores objects with versioning, lifecycle... | Reference |
| [gcp-cloud-tasks](../../skills/cncf/gcp-cloud-tasks/SKILL.md) | Cncf | "Manages task queues for asynchronous job execution with... | Reference |
| [gcp-compute-engine](../../skills/cncf/gcp-compute-engine/SKILL.md) | Cncf | "Deploys and manages virtual machine instances with... | Reference |
| [gcp-container-registry](../../skills/cncf/gcp-container-registry/SKILL.md) | Cncf | "Provides Stores and manages container images with... | Reference |
| [gcp-deployment-manager](../../skills/cncf/gcp-deployment-manager/SKILL.md) | Cncf | "Infrastructure as code using YAML templates for repeatable... | Reference |
| [gcp-firestore](../../skills/cncf/gcp-firestore/SKILL.md) | Cncf | Provides NoSQL document database with real-time sync,... | Reference |
| [gcp-gke](../../skills/cncf/gcp-gke/SKILL.md) | Cncf | "Provides Managed Kubernetes cluster with automatic... | Reference |
| [gcp-iam](../../skills/cncf/gcp-iam/SKILL.md) | Cncf | "Manages identity and access control with service accounts,... | Reference |
| [gcp-secret-manager](../../skills/cncf/gcp-secret-manager/SKILL.md) | Cncf | "Provides Stores and rotates secrets with encryption and... | Reference |
| [gcp-vpc](../../skills/cncf/gcp-vpc/SKILL.md) | Cncf | "Provides networking with subnets, firewall rules, and VPC... | Reference |
| [gdscript-patterns](../../skills/programming/gdscript-patterns/SKILL.md) | Programming | "Provides Master Godot 4 GDScript patterns including... | Implementation |
| [generate](../../skills/programming/generate/SKILL.md) | Programming | Provides generate images and videos using fal.ai ai models... | Implementation |
| [generation](../../skills/programming/generation/SKILL.md) | Programming | "Provides Generate real audio narratives from text content... | Implementation |
| [generation-doc-generate](../../skills/programming/generation-doc-generate/SKILL.md) | Programming | "Provides You are a documentation expert specializing in... | Implementation |
| [generator-builder](../../skills/programming/generator-builder/SKILL.md) | Programming | "Provides Expert in building shareable generator tools that... | Implementation |
| [geo](../../skills/programming/geo/SKILL.md) | Programming | "Provides Optimize content for AI Overviews, ChatGPT,... | Implementation |
| [geometry](../../skills/programming/geometry/SKILL.md) | Programming | "Provides Three.js geometry creation - built-in shapes,... | Implementation |
| [gif-creator](../../skills/programming/gif-creator/SKILL.md) | Programming | "Provides a toolkit providing utilities and knowledge for... | Implementation |
| [gift](../../skills/programming/gift/SKILL.md) | Programming | "Provides Relationship-aware daily gift engine with... | Implementation |
| [git-advanced](../../skills/coding/git-advanced/SKILL.md) | Coding | "Provides Advanced Git operations including rebasing,... | Reference |
| [git-branching-strategies](../../skills/coding/git-branching-strategies/SKILL.md) | Coding | "Git branching models including Git Flow, GitHub Flow,... | Implementation |
| [git-worktrees](../../skills/programming/git-worktrees/SKILL.md) | Programming | "Provides Git worktrees create isolated workspaces sharing... | Implementation |
| [github](../../skills/programming/github/SKILL.md) | Programming | "Provides use the `gh` cli for issues, pull requests,... | Implementation |
| [github-comments](../../skills/agent/github-comments/SKILL.md) | Agent | "Provides use when you need to address review or issue... | Orchestration |
| [github-repo-commander](../../skills/coding/github-repo-commander/SKILL.md) | Coding | "Provides 7-stage super workflow for GitHub repo audit,... | Implementation |
| [goal-to-milestones](../../skills/agent/goal-to-milestones/SKILL.md) | Agent | "Translates high-level goals into actionable milestones and... | Orchestration |
| [godot-4-migration](../../skills/programming/godot-4-migration/SKILL.md) | Programming | "Provides Specialized guide for migrating Godot 3.x... | Implementation |
| [golang](../../skills/programming/golang/SKILL.md) | Programming | "Provides Guide for building reliable, fault-tolerant Go... | Implementation |
| [golang](../../skills/programming/golang/SKILL.md) | Programming | "Provides Build production-ready gRPC services in Go with... | Implementation |
| [golang-pro](../../skills/agent/golang-pro/SKILL.md) | Agent | "Provides use when building durable distributed systems... | Orchestration |
| [graphql](../../skills/coding/graphql/SKILL.md) | Coding | Provides GraphQL gives clients exactly the data they need -... | Implementation |
| [gratitude](../../skills/programming/gratitude/SKILL.md) | Programming | Provides Multi-agent research skill for parallel research... | Implementation |
| [grpc](../../skills/cncf/grpc/SKILL.md) | Cncf | "gRPC in Remote Procedure Call - cloud native architecture,... | Reference |
| [guardian](../../skills/programming/guardian/SKILL.md) | Programming | Provides Guardiao de contexto que preserva dados criticos... | Implementation |
| [guidelines](../../skills/programming/guidelines/SKILL.md) | Programming | "Provides Write copy following Sentry brand guidelines. Use... | Implementation |
| [guidelines-anthropic](../../skills/programming/guidelines-anthropic/SKILL.md) | Programming | "Provides To access Anthropic's official brand identity and... | Implementation |
| [guidelines-community](../../skills/programming/guidelines-community/SKILL.md) | Programming | "Provides To access Anthropic's official brand identity and... | Implementation |
| [hacking-methodology](../../skills/coding/hacking-methodology/SKILL.md) | Coding | "Provides Master the complete penetration testing lifecycle... | Review |
| [handling-patterns](../../skills/programming/handling-patterns/SKILL.md) | Programming | "Provides Build resilient applications with robust error... | Implementation |
| [harbor](../../skills/cncf/harbor/SKILL.md) | Cncf | "Configures harbor in cloud-native engineering - container... | Reference |
| [health-analyzer](../../skills/programming/health-analyzer/SKILL.md) | Programming | "Provides 分析家族病史、评估遗 传风险、识别家庭健康模式、提 供个性化预防建议 functionality... | Implementation |
| [health-analyzer](../../skills/programming/health-analyzer/SKILL.md) | Programming | "Provides 分析心理健康数据、识 别心理模式、评估心理健康状况 、提供个性化心理健康建议。支... | Implementation |
| [health-analyzer](../../skills/programming/health-analyzer/SKILL.md) | Programming | "Provides 分析职业健康数据、识 别工作相关健康风险、评估职业 健康状况、提供个性化职业健康... | Implementation |
| [health-analyzer](../../skills/programming/health-analyzer/SKILL.md) | Programming | "Provides 分析口腔健康数据、识 别口腔问题模式、评估口腔健康 状况、提供个性化口腔健康建议... | Implementation |
| [health-analyzer](../../skills/programming/health-analyzer/SKILL.md) | Programming | "Provides sexual health analyzer functionality and... | Implementation |
| [health-analyzer](../../skills/programming/health-analyzer/SKILL.md) | Programming | Provides Analyze skin health data, identify skin problem... | Implementation |
| [health-analyzer](../../skills/programming/health-analyzer/SKILL.md) | Programming | "Provides 分析旅行健康数据、评 估目的地健康风险、提供疫苗接 种建议、生成多语言紧急医疗信... | Implementation |
| [helm](../../skills/cncf/helm/SKILL.md) | Cncf | "Provides Helm in Cloud-Native Engineering - The Kubernetes... | Reference |
| [hinton](../../skills/programming/hinton/SKILL.md) | Programming | "Provides Agente que simula Geoffrey Hinton — Godfather of... | Implementation |
| [hono](../../skills/coding/hono/SKILL.md) | Coding | "Provides Build ultra-fast web APIs and full-stack apps... | Implementation |
| [hooks-automation](../../skills/agent/hooks-automation/SKILL.md) | Agent | "Provides Master Git hooks setup with Husky, lint-staged,... | Orchestration |
| [hot-path-detector](../../skills/agent/hot-path-detector/SKILL.md) | Agent | "Identifies critical execution paths (hot paths) in code... | Debugging |
| [hr-payroll-setup](../../skills/programming/hr-payroll-setup/SKILL.md) | Programming | 'Provides Expert guide for Odoo HR and Payroll: salary... | Implementation |
| [hreflang](../../skills/programming/hreflang/SKILL.md) | Programming | "Provides Hreflang and international SEO audit, validation,... | Implementation |
| [html-injection](../../skills/coding/html-injection/SKILL.md) | Coding | "Provides Execute comprehensive client-side injection... | Review |
| [human-search-mcp](../../skills/agent/human-search-mcp/SKILL.md) | Agent | "Provides Search AI-ready websites, inspect indexed site... | Implementation |
| [hunter](../../skills/coding/hunter/SKILL.md) | Coding | "Provides Systematically finds and fixes bugs using proven... | Implementation |
| [hunter](../../skills/programming/hunter/SKILL.md) | Programming | "Provides Automatically hunt for high-impact OSS... | Implementation |
| [ia](../../skills/programming/ia/SKILL.md) | Programming | "Provides Especialista em leiloes judiciais e... | Implementation |
| [iam-best-practices](../../skills/coding/iam-best-practices/SKILL.md) | Coding | Provides IAM policy review, hardening, and least privilege... | Review |
| [ideas](../../skills/programming/ideas/SKILL.md) | Programming | "Provides Provide proven marketing strategies and growth... | Implementation |
| [identity-dotnet](../../skills/cncf/identity-dotnet/SKILL.md) | Cncf | "Provides Azure Identity SDK for .NET. Authentication... | Implementation |
| [identity-java](../../skills/cncf/identity-java/SKILL.md) | Cncf | "Provides Authenticate Java applications with Azure... | Implementation |
| [identity-py](../../skills/cncf/identity-py/SKILL.md) | Cncf | "Provides Azure Identity SDK for Python authentication. Use... | Implementation |
| [identity-rust](../../skills/cncf/identity-rust/SKILL.md) | Cncf | "Provides Azure Identity SDK for Rust authentication. Use... | Implementation |
| [identity-ts](../../skills/cncf/identity-ts/SKILL.md) | Cncf | "Provides Authenticate to Azure services with various... | Implementation |
| [image-edit](../../skills/programming/image-edit/SKILL.md) | Programming | Provides AI-powered image editing with style transfer and... | Implementation |
| [image-gen](../../skills/programming/image-gen/SKILL.md) | Programming | "Provides Generate SEO-focused images such as OG cards,... | Implementation |
| [imagen](../../skills/programming/imagen/SKILL.md) | Programming | "Provides AI image generation skill powered by Google... | Implementation |
| [images](../../skills/programming/images/SKILL.md) | Programming | "Provides Image optimization analysis for SEO and... | Implementation |
| [implement](../../skills/agent/implement/SKILL.md) | Agent | "Provides Execute tasks from a track's implementation plan... | Orchestration |
| [implementation](../../skills/agent/implementation/SKILL.md) | Agent | Provides RAG (Retrieval-Augmented Generation)... | Implementation |
| [implementation](../../skills/cncf/implementation/SKILL.md) | Cncf | Provides Framework for defining and implementing Service... | Implementation |
| [implementation](../../skills/coding/implementation/SKILL.md) | Coding | "Provides Implement Command Query Responsibility... | Implementation |
| [implementation-patterns](../../skills/coding/implementation-patterns/SKILL.md) | Coding | "Provides Build secure, scalable authentication and... | Review |
| [impress](../../skills/programming/impress/SKILL.md) | Programming | "Provides Presentation creation, format conversion... | Implementation |
| [improver](../../skills/agent/improver/SKILL.md) | Agent | "Provides Iteratively improve a Claude Code skill using the... | Implementation |
| [in-chrome-troubleshooting](../../skills/programming/in-chrome-troubleshooting/SKILL.md) | Programming | Provides Diagnose and fix Claude in Chrome MCP extension... | Implementation |
| [in-toto](../../skills/cncf/in-toto/SKILL.md) | Cncf | "in-toto in Supply Chain Security - cloud native... | Reference |
| [index-tuning](../../skills/programming/index-tuning/SKILL.md) | Programming | Provides Optimize vector index performance for latency,... | Implementation |
| [influencer-discovery](../../skills/agent/influencer-discovery/SKILL.md) | Agent | Provides Find and evaluate influencers for brand... | Implementation |
| [infra-drift-detector](../../skills/agent/infra-drift-detector/SKILL.md) | Agent | "Detects and reports infrastructure drift between desired... | Debugging |
| [infrastructure](../../skills/agent/infrastructure/SKILL.md) | Agent | Provides Terraform infrastructure as code workflow for... | Implementation |
| [injection-testing](../../skills/coding/injection-testing/SKILL.md) | Coding | Provides Identify and exploit HTML injection... | Review |
| [injection-testing](../../skills/coding/injection-testing/SKILL.md) | Coding | Provides Execute comprehensive SQL injection vulnerability... | Review |
| [inngest](../../skills/agent/inngest/SKILL.md) | Agent | "Provides Inngest expert for serverless-first background... | Orchestration |
| [inputs](../../skills/programming/inputs/SKILL.md) | Programming | "Provides Check for .claude/apple-design-context.md before... | Implementation |
| [instagram](../../skills/programming/instagram/SKILL.md) | Programming | "Provides Integracao completa com Instagram via Graph API.... | Implementation |
| [installer](../../skills/agent/installer/SKILL.md) | Agent | "Provides Instala, valida, registra e verifica novas skills... | Implementation |
| [integration](../../skills/cncf/integration/SKILL.md) | Cncf | "Provides Expert patterns for HubSpot CRM integration... | Implementation |
| [integration](../../skills/cncf/integration/SKILL.md) | Cncf | "Provides Integrate Stripe, PayPal, and payment processors.... | Implementation |
| [integration](../../skills/cncf/integration/SKILL.md) | Cncf | "Provides Master PayPal payment integration including... | Implementation |
| [integration](../../skills/cncf/integration/SKILL.md) | Cncf | "Provides Master Stripe payment processing integration for... | Implementation |
| [integration](../../skills/cncf/integration/SKILL.md) | Cncf | "Provides Integration skill for searching and fetching... | Implementation |
| [intelligence](../../skills/agent/intelligence/SKILL.md) | Agent | "Provides Protocolo de Inteligência Pré-Tarefa — ativa... | Orchestration |
| [interaction](../../skills/programming/interaction/SKILL.md) | Programming | "Provides Three.js interaction - raycasting, controls,... | Implementation |
| [inventor](../../skills/programming/inventor/SKILL.md) | Programming | "Provides Product Inventor e Design Alchemist de nivel... | Implementation |
| [inventory-optimizer](../../skills/programming/inventory-optimizer/SKILL.md) | Programming | 'Provides Expert guide for Odoo Inventory: stock valuation... | Implementation |
| [issue-auditor](../../skills/programming/issue-auditor/SKILL.md) | Programming | "Provides High-level technical SEO and site architecture... | Implementation |
| [issue-creator](../../skills/programming/issue-creator/SKILL.md) | Programming | "Provides Turn error logs, screenshots, voice notes, and... | Implementation |
| [issue-gate](../../skills/agent/issue-gate/SKILL.md) | Agent | "Provides use when starting a new implementation task and... | Orchestration |
| [issues](../../skills/agent/issues/SKILL.md) | Agent | "Implements interact with github issues - create, list, and... | Orchestration |
| [istio](../../skills/cncf/istio/SKILL.md) | Cncf | "Istio in Cloud-Native Engineering - Connect, secure,... | Reference |
| [jaeger](../../skills/cncf/jaeger/SKILL.md) | Cncf | "Configures jaeger in cloud-native engineering -... | Reference |
| [java](../../skills/coding/java/SKILL.md) | Coding | Provides Scaffold, write, debug, and enhance... | Review |
| [javascript-patterns](../../skills/programming/javascript-patterns/SKILL.md) | Programming | "Provides Comprehensive guide for mastering modern... | Implementation |
| [jetpack-compose-expert](../../skills/programming/jetpack-compose-expert/SKILL.md) | Programming | "Provides Expert guidance for building modern Android UIs... | Implementation |
| [jobgpt](../../skills/programming/jobgpt/SKILL.md) | Programming | "Provides Job search automation, auto apply, resume... | Implementation |
| [jobs](../../skills/programming/jobs/SKILL.md) | Programming | "Provides Agente que simula Steve Jobs — cofundador da... | Implementation |
| [jq](../../skills/programming/jq/SKILL.md) | Programming | "Provides Expert jq usage for JSON querying, filtering,... | Implementation |
| [js](../../skills/programming/js/SKILL.md) | Programming | "Provides Run Hugging Face models in JavaScript or... | Implementation |
| [juice-shop](../../skills/coding/juice-shop/SKILL.md) | Coding | "'OWASP Juice Shop guide: Web application security testing... | Implementation |
| [juridico](../../skills/programming/juridico/SKILL.md) | Programming | 'Provides Analise juridica de leiloes: nulidades, bem de... | Implementation |
| [k8s-debugger](../../skills/agent/k8s-debugger/SKILL.md) | Agent | "Diagnoses Kubernetes cluster issues, debug pods,... | Debugging |
| [kaizen](../../skills/coding/kaizen/SKILL.md) | Coding | "Provides Guide for continuous improvement, error proofing,... | Review |
| [karmada](../../skills/cncf/karmada/SKILL.md) | Cncf | "Provides Karmada in Cloud-Native Engineering -... | Reference |
| [karpathy](../../skills/programming/karpathy/SKILL.md) | Programming | "Provides Agente que simula Andrej Karpathy — ex-Director... | Implementation |
| [keda](../../skills/cncf/keda/SKILL.md) | Cncf | "Configures keda in cloud-native engineering - event-driven... | Reference |
| [keycloak](../../skills/cncf/keycloak/SKILL.md) | Cncf | "Provides Keycloak in Cloud-Native Engineering - identity... | Reference |
| [keyvault-certificates-rust](../../skills/cncf/keyvault-certificates-rust/SKILL.md) | Cncf | "Provides Azure Key Vault Certificates SDK for Rust. Use... | Implementation |
| [keyvault-keys-rust](../../skills/cncf/keyvault-keys-rust/SKILL.md) | Cncf | "Provides Azure Key Vault Keys SDK for Rust. Use for... | Implementation |
| [keyvault-keys-ts](../../skills/cncf/keyvault-keys-ts/SKILL.md) | Cncf | "Provides Manage cryptographic keys using Azure Key Vault... | Implementation |
| [keyvault-py](../../skills/cncf/keyvault-py/SKILL.md) | Cncf | "Provides Azure Key Vault SDK for Python. Use for secrets,... | Implementation |
| [keyvault-secrets-rust](../../skills/cncf/keyvault-secrets-rust/SKILL.md) | Cncf | "Provides Azure Key Vault Secrets SDK for Rust. Use for... | Implementation |
| [keyvault-secrets-ts](../../skills/cncf/keyvault-secrets-ts/SKILL.md) | Cncf | "Provides Manage secrets using Azure Key Vault Secrets SDK... | Implementation |
| [keyword-strategist](../../skills/programming/keyword-strategist/SKILL.md) | Programming | "Analyzes keyword usage in provided content, calculates... | Implementation |
| [knative](../../skills/cncf/knative/SKILL.md) | Cncf | "Provides Knative in Cloud-Native Engineering - serverless... | Reference |
| [knowledge-extraction](../../skills/programming/knowledge-extraction/SKILL.md) | Programming | Provides Extract structured domain knowledge from AI models... | Implementation |
| [kong](../../skills/cncf/kong/SKILL.md) | Cncf | "Kong in API Gateway - cloud native architecture, patterns,... | Reference |
| [kong-ingress-controller](../../skills/cncf/kong-ingress-controller/SKILL.md) | Cncf | "Kong Ingress Controller in Kubernetes - cloud native... | Reference |
| [krustlet](../../skills/cncf/krustlet/SKILL.md) | Cncf | "Krustlet in Kubernetes Runtime - cloud native... | Reference |
| [kserve](../../skills/cncf/kserve/SKILL.md) | Cncf | "Configures kserve in cloud-native engineering - model... | Reference |
| [kubeedge](../../skills/cncf/kubeedge/SKILL.md) | Cncf | "Configures kubeedge in cloud-native engineering - edge... | Reference |
| [kubeflow](../../skills/cncf/kubeflow/SKILL.md) | Cncf | "Configures kubeflow in cloud-native engineering - ml on... | Reference |
| [kubernetes](../../skills/cncf/kubernetes/SKILL.md) | Cncf | "Kubernetes in Cloud-Native Engineering - Production-Grade... | Reference |
| [kubescape](../../skills/cncf/kubescape/SKILL.md) | Cncf | "Configures kubescape in cloud-native engineering -... | Reference |
| [kubevela](../../skills/cncf/kubevela/SKILL.md) | Cncf | "Configures kubevela in cloud-native engineering -... | Reference |
| [kubevirt](../../skills/cncf/kubevirt/SKILL.md) | Cncf | "Provides KubeVirt in Cloud-Native Engineering -... | Reference |
| [kuma](../../skills/cncf/kuma/SKILL.md) | Cncf | "Kuma in Service Mesh - cloud native architecture,... | Reference |
| [kyverno](../../skills/cncf/kyverno/SKILL.md) | Cncf | "Configures kyverno in cloud-native engineering - policy... | Reference |
| [l10n-compliance](../../skills/programming/l10n-compliance/SKILL.md) | Programming | 'Provides Country-specific Odoo localization: tax... | Implementation |
| [lab](../../skills/programming/lab/SKILL.md) | Programming | "Provides lab environment for claude superpowers... | Implementation |
| [landscape](../../skills/programming/landscape/SKILL.md) | Programming | "Provides Comprehensive frameworks for analyzing... | Implementation |
| [lang](../../skills/agent/lang/SKILL.md) | Agent | Provides Native agent-to-agent language for compact... | Implementation |
| [langfuse](../../skills/programming/langfuse/SKILL.md) | Programming | Provides Expert in Langfuse - the open-source LLM... | Implementation |
| [langgraph](../../skills/agent/langgraph/SKILL.md) | Agent | Provides Expert in LangGraph - the production-grade... | Implementation |
| [last30days](../../skills/programming/last30days/SKILL.md) | Programming | "Provides Research a topic from the last 30 days on Reddit... | Implementation |
| [layout](../../skills/programming/layout/SKILL.md) | Programming | "CRITICAL: Use for Makepad layout system. Triggers on"... | Implementation |
| [layout-zafiro](../../skills/programming/layout-zafiro/SKILL.md) | Programming | "Provides Guidelines for modern Avalonia UI layout using... | Implementation |
| [lead-generation](../../skills/agent/lead-generation/SKILL.md) | Agent | Implements scrape leads from multiple platforms using apify... | Implementation |
| [learn](../../skills/programming/learn/SKILL.md) | Programming | Provides Machine learning in Python with scikit-learn. Use... | Implementation |
| [learning-ops-ml-pipeline](../../skills/programming/learning-ops-ml-pipeline/SKILL.md) | Programming | 'Provides design and implement a complete ml pipeline for:... | Implementation |
| [lecun](../../skills/programming/lecun/SKILL.md) | Programming | "Provides Agente que simula Yann LeCun — inventor das... | Implementation |
| [lecun-debate](../../skills/programming/lecun-debate/SKILL.md) | Programming | "Provides Sub-skill de debates e posições de Yann LeCun.... | Implementation |
| [lecun-filosofia](../../skills/programming/lecun-filosofia/SKILL.md) | Programming | "Provides sub-skill filosófica e pedagógica de yann lecun... | Implementation |
| [lecun-tecnico](../../skills/programming/lecun-tecnico/SKILL.md) | Programming | "Provides Sub-skill técnica de Yann LeCun. Cobre CNNs,... | Implementation |
| [legal-seo-audit](../../skills/programming/legal-seo-audit/SKILL.md) | Programming | "Provides Audit and improve local SEO for law firms,... | Implementation |
| [leiloeiros](../../skills/coding/leiloeiros/SKILL.md) | Coding | "Provides Coleta e consulta dados de leiloeiros oficiais de... | Implementation |
| [lex](../../skills/programming/lex/SKILL.md) | Programming | "Provides Centralized 'Truth Engine' for... | Implementation |
| [library](../../skills/programming/library/SKILL.md) | Programming | "Provides Extensive icon library and AI-driven icon... | Implementation |
| [library](../../skills/programming/library/SKILL.md) | Programming | "Provides a comprehensive collection of battle-tested... | Implementation |
| [lighting](../../skills/programming/lighting/SKILL.md) | Programming | "Provides Three.js lighting - light types, shadows,... | Implementation |
| [like-socrates](../../skills/programming/like-socrates/SKILL.md) | Programming | "Explains concepts using Socratic-style dialogue. Use when... | Implementation |
| [lima](../../skills/cncf/lima/SKILL.md) | Cncf | "Lima in Container Runtime - cloud native architecture,... | Reference |
| [line-psychologist](../../skills/programming/line-psychologist/SKILL.md) | Programming | "Provides one sentence - what this skill does and when to... | Implementation |
| [linkerd](../../skills/cncf/linkerd/SKILL.md) | Cncf | "Linkerd in Service Mesh - cloud native architecture,... | Reference |
| [linux](../../skills/programming/linux/SKILL.md) | Programming | "Provides Bash/Linux terminal patterns. Critical commands,... | Implementation |
| [liquid-glass](../../skills/programming/liquid-glass/SKILL.md) | Programming | "Provides Implement or review SwiftUI Liquid Glass APIs... | Implementation |
| [litmus](../../skills/cncf/litmus/SKILL.md) | Cncf | "Litmus in Chaos Engineering - cloud native architecture,... | Reference |
| [llm-expert](../../skills/programming/llm-expert/SKILL.md) | Programming | Provides Master local LLM inference, model selection, VRAM... | Implementation |
| [load-testing](../../skills/coding/load-testing/SKILL.md) | Coding | "Provides Comprehensive k6 load testing skill for API,... | Review |
| [loaders](../../skills/programming/loaders/SKILL.md) | Programming | "Provides Three.js asset loading - GLTF, textures, images,... | Implementation |
| [localization](../../skills/programming/localization/SKILL.md) | Programming | "Provides Internationalization and localization patterns.... | Implementation |
| [longhorn](../../skills/cncf/longhorn/SKILL.md) | Cncf | "Longhorn in Cloud Native Storage - cloud native... | Reference |
| [loop](../../skills/programming/loop/SKILL.md) | Programming | "Teaches agents to iteratively build websites using Stitch... | Implementation |
| [loop-delivery](../../skills/agent/loop-delivery/SKILL.md) | Agent | "Provides use when a coding task must be completed against... | Orchestration |
| [macro-analyzer](../../skills/programming/macro-analyzer/SKILL.md) | Programming | "Provides Professional PESTEL/SWOT analysis agent based on... | Implementation |
| [magnets](../../skills/programming/magnets/SKILL.md) | Programming | "Provides Plan and optimize lead magnets for email capture... | Implementation |
| [make-patterns](../../skills/agent/make-patterns/SKILL.md) | Agent | Provides No-code automation democratizes workflow building.... | Implementation |
| [makepad-animation](../../skills/programming/makepad-animation/SKILL.md) | Programming | Implements Makepad animation system patterns with... | Implementation |
| [manage](../../skills/agent/manage/SKILL.md) | Agent | 'Provides Manage track lifecycle: archive, restore, delete,... | Orchestration |
| [management](../../skills/agent/management/SKILL.md) | Agent | "Provides use this skill when creating, managing, or... | Orchestration |
| [management](../../skills/cncf/management/SKILL.md) | Cncf | Provides Server management principles and decision-making.... | Implementation |
| [management](../../skills/coding/management/SKILL.md) | Coding | Provides Secure secrets management practices for CI/CD... | Review |
| [management](../../skills/programming/management/SKILL.md) | Programming | "Provides Manage citations systematically throughout the... | Implementation |
| [management](../../skills/programming/management/SKILL.md) | Programming | "Provides Build efficient, scalable monorepos that enable... | Implementation |
| [management-context-restore](../../skills/programming/management-context-restore/SKILL.md) | Programming | Provides use when working with context management context... | Implementation |
| [management-context-save](../../skills/programming/management-context-save/SKILL.md) | Programming | Provides use when working with context management context... | Implementation |
| [management-deps-audit](../../skills/coding/management-deps-audit/SKILL.md) | Coding | "Provides You are a dependency security expert specializing... | Review |
| [manager](../../skills/programming/manager/SKILL.md) | Programming | Provides Elite AI context engineering specialist mastering... | Implementation |
| [manager](../../skills/programming/manager/SKILL.md) | Programming | "Provides Senior PM agent with 6 knowledge domains, 30+... | Implementation |
| [manager](../../skills/programming/manager/SKILL.md) | Programming | "Provides Monitor portfolio risk, R-multiples, and position... | Implementation |
| [manager-hospital](../../skills/programming/manager-hospital/SKILL.md) | Programming | "Provides World-class Hospital IT Management Advisor... | Implementation |
| [manager-pro](../../skills/programming/manager-pro/SKILL.md) | Programming | Provides Elite IT Management Advisor specializing in... | Implementation |
| [manager-skill](../../skills/agent/manager-skill/SKILL.md) | Agent | Provides Manage multiple local CLI agents via tmux sessions... | Implementation |
| [manager-toolkit](../../skills/programming/manager-toolkit/SKILL.md) | Programming | "Provides Essential tools and frameworks for modern product... | Implementation |
| [manifest](../../skills/programming/manifest/SKILL.md) | Programming | "Provides Install and configure the Manifest observability... | Implementation |
| [manifest-generator](../../skills/cncf/manifest-generator/SKILL.md) | Cncf | Provides Step-by-step guidance for creating... | Implementation |
| [manufacturing-advisor](../../skills/programming/manufacturing-advisor/SKILL.md) | Programming | 'Provides Expert guide for Odoo Manufacturing: Bills of... | Implementation |
| [maps-search-dotnet](../../skills/cncf/maps-search-dotnet/SKILL.md) | Cncf | "Provides Azure Maps SDK for .NET. Location-based services... | Implementation |
| [markdown](../../skills/programming/markdown/SKILL.md) | Programming | "Provides Create and edit Obsidian Flavored Markdown with... | Implementation |
| [markdown-best-practices](../../skills/coding/markdown-best-practices/SKILL.md) | Coding | "Provides Markdown best practices for OpenCode skills -... | Implementation |
| [market-research](../../skills/agent/market-research/SKILL.md) | Agent | Provides Analyze market conditions, geographic... | Implementation |
| [marketer](../../skills/programming/marketer/SKILL.md) | Programming | Provides Elite content marketing strategist specializing in... | Implementation |
| [marketing-context](../../skills/programming/marketing-context/SKILL.md) | Programming | "Provides Create or update a reusable product marketing... | Implementation |
| [markup](../../skills/programming/markup/SKILL.md) | Programming | Provides Design, validate, and optimize schema.org... | Implementation |
| [mastery](../../skills/programming/mastery/SKILL.md) | Programming | "Provides 33+ essential JavaScript concepts every developer... | Implementation |
| [materials](../../skills/programming/materials/SKILL.md) | Programming | "Provides Three.js materials - PBR, basic, phong, shader... | Implementation |
| [matplotlib](../../skills/programming/matplotlib/SKILL.md) | Programming | "Provides Matplotlib is Python's foundational visualization... | Implementation |
| [matrix-integration](../../skills/programming/matrix-integration/SKILL.md) | Programming | "CRITICAL: Use for Matrix SDK integration with Makepad.... | Implementation |
| [maxia](../../skills/programming/maxia/SKILL.md) | Programming | "Provides Connect to MAXIA AI-to-AI marketplace on Solana.... | Implementation |
| [mcp](../../skills/programming/mcp/SKILL.md) | Programming | Provides Connect to Helium's MCP server for news research,... | Implementation |
| [mcp-governance](../../skills/programming/mcp-governance/SKILL.md) | Programming | "Provides Agent governance skill for MCP tool calls — Cedar... | Implementation |
| [mcp-tools-expert](../../skills/agent/mcp-tools-expert/SKILL.md) | Agent | Provides Expert guide for using n8n-mcp MCP tools... | Implementation |
| [md](../../skills/programming/md/SKILL.md) | Programming | Provides this skill should be used when the user asks to... | Implementation |
| [md](../../skills/programming/md/SKILL.md) | Programming | Provides Convert human-written CLAUDE.md into AI-native... | Implementation |
| [md](../../skills/programming/md/SKILL.md) | Programming | "Provides Analyze Stitch projects and synthesize a semantic... | Implementation |
| [md](../../skills/programming/md/SKILL.md) | Programming | 'Provides 6-layer AI governance: safety gates,... | Implementation |
| [medtech-compliance-auditor](../../skills/programming/medtech-compliance-auditor/SKILL.md) | Programming | "Provides Expert AI auditor for Medical Device (SaMD)... | Implementation |
| [memory](../../skills/agent/memory/SKILL.md) | Agent | "Provides Persistent memory systems for LLM conversations... | Implementation |
| [memory-mcp](../../skills/programming/memory-mcp/SKILL.md) | Programming | Provides a hybrid memory system that provides persistent,... | Implementation |
| [memory-systems](../../skills/agent/memory-systems/SKILL.md) | Agent | 'Provides Memory is the cornerstone of intelligent agents.... | Implementation |
| [memory-usage-analyzer](../../skills/agent/memory-usage-analyzer/SKILL.md) | Agent | "Analyzes memory allocation patterns, identifies memory... | Debugging |
| [mental-states](../../skills/programming/mental-states/SKILL.md) | Programming | Provides this skill should be used when the user asks to... | Implementation |
| [menubar-tuist-app](../../skills/programming/menubar-tuist-app/SKILL.md) | Programming | "Provides Build, refactor, or review SwiftUI macOS menubar... | Implementation |
| [mercado](../../skills/programming/mercado/SKILL.md) | Programming | "Provides Analise de mercado imobiliario para leiloes.... | Implementation |
| [mesh-expert](../../skills/cncf/mesh-expert/SKILL.md) | Cncf | Provides Expert service mesh architect specializing in... | Implementation |
| [mesh-observability](../../skills/cncf/mesh-observability/SKILL.md) | Cncf | Provides Complete guide to observability patterns for... | Implementation |
| [messaging-webpubsub-java](../../skills/cncf/messaging-webpubsub-java/SKILL.md) | Cncf | "Provides Build real-time web applications with Azure Web... | Implementation |
| [messaging-webpubsubservice-py](../../skills/cncf/messaging-webpubsubservice-py/SKILL.md) | Cncf | "Provides Azure Web PubSub Service SDK for Python. Use for... | Implementation |
| [meta-optimizer](../../skills/programming/meta-optimizer/SKILL.md) | Programming | "Creates optimized meta titles, descriptions, and URL... | Implementation |
| [metadata](../../skills/coding/metadata/SKILL.md) | Coding | Provides Audit and fix HTML metadata including page titles,... | Implementation |
| [metal3-io](../../skills/cncf/metal3-io/SKILL.md) | Cncf | "metal3.io in Bare Metal Provisioning - cloud native... | Reference |
| [metrics-calculation](../../skills/programming/metrics-calculation/SKILL.md) | Programming | "Provides Calculate portfolio risk metrics including VaR,... | Implementation |
| [metrics-framework](../../skills/programming/metrics-framework/SKILL.md) | Programming | "Provides Comprehensive guide to tracking, calculating, and... | Implementation |
| [mgmt-apicenter-dotnet](../../skills/cncf/mgmt-apicenter-dotnet/SKILL.md) | Cncf | "Provides Azure API Center SDK for .NET. Centralized API... | Implementation |
| [mgmt-apicenter-py](../../skills/cncf/mgmt-apicenter-py/SKILL.md) | Cncf | Provides Azure API Center Management SDK for Python. Use... | Implementation |
| [mgmt-apimanagement-dotnet](../../skills/cncf/mgmt-apimanagement-dotnet/SKILL.md) | Cncf | "Configures azure resource manager sdk for api management... | Implementation |
| [mgmt-apimanagement-py](../../skills/cncf/mgmt-apimanagement-py/SKILL.md) | Cncf | "Provides Azure API Management SDK for Python. Use for... | Implementation |
| [mgmt-applicationinsights-dotnet](../../skills/cncf/mgmt-applicationinsights-dotnet/SKILL.md) | Cncf | "Provides Azure Application Insights SDK for .NET.... | Implementation |
| [mgmt-arizeaiobservabilityeval-dotnet](../../skills/cncf/mgmt-arizeaiobservabilityeval-dotnet/SKILL.md) | Cncf | "Provides Azure Resource Manager SDK for Arize AI... | Implementation |
| [mgmt-botservice-dotnet](../../skills/cncf/mgmt-botservice-dotnet/SKILL.md) | Cncf | "Provides Azure Resource Manager SDK for Bot Service in... | Implementation |
| [mgmt-botservice-py](../../skills/cncf/mgmt-botservice-py/SKILL.md) | Cncf | "Provides Azure Bot Service Management SDK for Python. Use... | Implementation |
| [mgmt-fabric-dotnet](../../skills/cncf/mgmt-fabric-dotnet/SKILL.md) | Cncf | "Configures azure resource manager sdk for fabric in .net... | Implementation |
| [mgmt-fabric-py](../../skills/cncf/mgmt-fabric-py/SKILL.md) | Cncf | "Provides Azure Fabric Management SDK for Python. Use for... | Implementation |
| [mgmt-mongodbatlas-dotnet](../../skills/cncf/mgmt-mongodbatlas-dotnet/SKILL.md) | Cncf | "Provides Manage MongoDB Atlas Organizations as Azure ARM... | Implementation |
| [mgmt-weightsandbiases-dotnet](../../skills/cncf/mgmt-weightsandbiases-dotnet/SKILL.md) | Cncf | "Provides Azure Weights & Biases SDK for .NET. ML... | Implementation |
| [microsoft-playwright-testing-ts](../../skills/cncf/microsoft-playwright-testing-ts/SKILL.md) | Cncf | Provides Run Playwright tests at scale with cloud-hosted... | Implementation |
| [migration](../../skills/cncf/migration/SKILL.md) | Cncf | "Provides Master database schema and data migrations across... | Implementation |
| [migration](../../skills/programming/migration/SKILL.md) | Programming | "Provides Master AngularJS to Angular migration, including... | Implementation |
| [migration-code-migrate](../../skills/programming/migration-code-migrate/SKILL.md) | Programming | "Provides You are a code migration expert specializing in... | Implementation |
| [migration-deps-upgrade](../../skills/programming/migration-deps-upgrade/SKILL.md) | Programming | "Provides You are a dependency management expert... | Implementation |
| [migration-helper](../../skills/programming/migration-helper/SKILL.md) | Programming | "Provides Step-by-step guide for migrating Odoo custom... | Implementation |
| [migration-legacy-modernize](../../skills/programming/migration-legacy-modernize/SKILL.md) | Programming | "Provides Orchestrate a comprehensive legacy system... | Implementation |
| [migrations-migration-observability](../../skills/cncf/migrations-migration-observability/SKILL.md) | Cncf | Configures migration monitoring, cdc, and observability... | Implementation |
| [migrations-sql-migrations](../../skills/cncf/migrations-sql-migrations/SKILL.md) | Cncf | Provides SQL database migrations with zero-downtime... | Implementation |
| [mini-app](../../skills/programming/mini-app/SKILL.md) | Programming | "Provides Expert in building Telegram Mini Apps (TWA) - web... | Implementation |
| [mirror](../../skills/programming/mirror/SKILL.md) | Programming | "Provides one sentence - what this skill does and when to... | Implementation |
| [mitigation-mapping](../../skills/coding/mitigation-mapping/SKILL.md) | Coding | "Provides Map identified threats to appropriate security... | Review |
| [ml](../../skills/agent/ml/SKILL.md) | Agent | "Provides AI and machine learning workflow covering LLM... | Implementation |
| [mobile-development-component-scaffold](../../skills/coding/mobile-development-component-scaffold/SKILL.md) | Coding | "Provides You are a React component architecture expert... | Implementation |
| [mobile-security-xss-scan](../../skills/programming/mobile-security-xss-scan/SKILL.md) | Programming | Provides You are a frontend security specialist focusing on... | Implementation |
| [mode](../../skills/programming/mode/SKILL.md) | Programming | 'Provides Version 2.35.0 | PRD to Production | Zero Human... | Implementation |
| [modeling-expert](../../skills/coding/modeling-expert/SKILL.md) | Coding | "Provides Expert in threat modeling methodologies, security... | Review |
| [models-py](../../skills/programming/models-py/SKILL.md) | Programming | "Provides Create Pydantic models following the multi-model... | Implementation |
| [modernization](../../skills/programming/modernization/SKILL.md) | Programming | "Provides Master React version upgrades, class to hooks... | Implementation |
| [modernizer](../../skills/programming/modernizer/SKILL.md) | Programming | "Provides Refactor legacy codebases, migrate outdated... | Implementation |
| [modes](../../skills/agent/modes/SKILL.md) | Agent | "Provides AI operational modes (brainstorm, implement,... | Implementation |
| [module-developer](../../skills/programming/module-developer/SKILL.md) | Programming | "Provides Expert guide for creating custom Odoo modules.... | Implementation |
| [module-library](../../skills/cncf/module-library/SKILL.md) | Cncf | Provides Production-ready Terraform module patterns for... | Implementation |
| [molykit](../../skills/programming/molykit/SKILL.md) | Programming | "CRITICAL: Use for MolyKit AI chat toolkit. Triggers on"... | Implementation |
| [monetization](../../skills/programming/monetization/SKILL.md) | Programming | "Provides Estrategia e implementacao de monetizacao para... | Implementation |
| [monitor](../../skills/programming/monitor/SKILL.md) | Programming | Provides Monitor de performance do Claude Code e sistema... | Implementation |
| [monitor-ingestion-java](../../skills/cncf/monitor-ingestion-java/SKILL.md) | Cncf | Provides Azure Monitor Ingestion SDK for Java. Send custom... | Implementation |
| [monitor-ingestion-py](../../skills/cncf/monitor-ingestion-py/SKILL.md) | Cncf | "Provides Azure Monitor Ingestion SDK for Python. Use for... | Implementation |
| [monitor-opentelemetry-exporter-java](../../skills/cncf/monitor-opentelemetry-exporter-java/SKILL.md) | Cncf | "Provides Azure Monitor OpenTelemetry Exporter for Java.... | Implementation |
| [monitor-opentelemetry-exporter-py](../../skills/cncf/monitor-opentelemetry-exporter-py/SKILL.md) | Cncf | "Provides Azure Monitor OpenTelemetry Exporter for Python.... | Implementation |
| [monitor-opentelemetry-py](../../skills/cncf/monitor-opentelemetry-py/SKILL.md) | Cncf | "Provides Azure Monitor OpenTelemetry Distro for Python.... | Implementation |
| [monitor-opentelemetry-ts](../../skills/cncf/monitor-opentelemetry-ts/SKILL.md) | Cncf | "Provides Auto-instrument Node.js applications with... | Implementation |
| [monitor-query-java](../../skills/cncf/monitor-query-java/SKILL.md) | Cncf | "Provides Azure Monitor Query SDK for Java. Execute Kusto... | Implementation |
| [monitor-query-py](../../skills/cncf/monitor-query-py/SKILL.md) | Cncf | "Provides Azure Monitor Query SDK for Python. Use for... | Implementation |
| [monitoring-monitor-setup](../../skills/cncf/monitoring-monitor-setup/SKILL.md) | Cncf | "Provides You are a monitoring and observability expert... | Implementation |
| [monitoring-slo-implement](../../skills/cncf/monitoring-slo-implement/SKILL.md) | Cncf | "Provides You are an SLO (Service Level Objective) expert... | Implementation |
| [motion-performance](../../skills/coding/motion-performance/SKILL.md) | Coding | Provides Audit and fix animation performance issues... | Implementation |
| [moyu](../../skills/programming/moyu/SKILL.md) | Programming | "Anti-over-engineering guardrail that activates when an AI... | Implementation |
| [multi-skill-executor](../../skills/agent/multi-skill-executor/SKILL.md) | Agent | "Orchestrates execution of multiple skill specifications in... | Orchestration |
| [multi-tenant](../../skills/cncf/multi-tenant/SKILL.md) | Cncf | "Provides Design and implement multi-tenant SaaS... | Implementation |
| [multiplayer](../../skills/programming/multiplayer/SKILL.md) | Programming | "Provides Multiplayer game development principles.... | Implementation |
| [musk](../../skills/programming/musk/SKILL.md) | Programming | "Provides Agente que simula Elon Musk com profundidade... | Implementation |
| [mvp-launcher](../../skills/programming/mvp-launcher/SKILL.md) | Programming | "Provides use when planning or building a saas mvp from... | Implementation |
| [native-architecture](../../skills/programming/native-architecture/SKILL.md) | Programming | "Provides Production-ready patterns for React Native... | Implementation |
| [native-cli](../../skills/programming/native-cli/SKILL.md) | Programming | Provides Design spec with 98 rules for building CLI tools... | Implementation |
| [native-ui](../../skills/programming/native-ui/SKILL.md) | Programming | "Provides Complete guide for building beautiful apps with... | Implementation |
| [nats](../../skills/cncf/nats/SKILL.md) | Cncf | "NATS in Cloud Native Messaging - cloud native... | Reference |
| [neon](../../skills/cncf/neon/SKILL.md) | Cncf | Provides Neon is a serverless Postgres platform that... | Implementation |
| [network-diagnostics](../../skills/agent/network-diagnostics/SKILL.md) | Agent | "Diagnoses network connectivity issues, identifies... | Debugging |
| [networking-osi](../../skills/cncf/networking-osi/SKILL.md) | Cncf | "OSI Model Networking for Cloud-Native - All 7 layers with... | Reference |
| [networkx](../../skills/programming/networkx/SKILL.md) | Programming | "Provides NetworkX is a Python package for creating,... | Implementation |
| [new-track](../../skills/agent/new-track/SKILL.md) | Agent | "Provides Create a new track with specification and phased... | Orchestration |
| [news-report](../../skills/programming/news-report/SKILL.md) | Programming | "Provides Scrapes content based on a preset URL list,... | Implementation |
| [nextjs-development](../../skills/agent/nextjs-development/SKILL.md) | Agent | "Provides React and Next.js 14+ application development... | Implementation |
| [node-configuration](../../skills/agent/node-configuration/SKILL.md) | Agent | Provides Operation-aware node configuration guidance. Use... | Implementation |
| [nonconformance](../../skills/programming/nonconformance/SKILL.md) | Programming | "Provides Codified expertise for quality control,... | Implementation |
| [notary-project](../../skills/cncf/notary-project/SKILL.md) | Cncf | "Notary Project in Content Trust &amp; Security - cloud... | Reference |
| [notebooklm](../../skills/programming/notebooklm/SKILL.md) | Programming | Provides Interact with Google NotebookLM to query... | Implementation |
| [oathkeeper](../../skills/cncf/oathkeeper/SKILL.md) | Cncf | "Oathkeeper in Identity & Access - cloud native... | Reference |
| [official](../../skills/programming/official/SKILL.md) | Programming | "Provides a user may ask you to create, edit, or analyze... | Implementation |
| [official](../../skills/programming/official/SKILL.md) | Programming | "Provides this guide covers essential pdf processing... | Implementation |
| [official](../../skills/programming/official/SKILL.md) | Programming | "Provides a user may ask you to create, edit, or analyze... | Implementation |
| [official](../../skills/programming/official/SKILL.md) | Programming | "Provides unless otherwise stated by the user or existing... | Implementation |
| [omega](../../skills/coding/omega/SKILL.md) | Coding | "Provides CISO operacional enterprise para gestao total de... | Review |
| [on-windows](../../skills/programming/on-windows/SKILL.md) | Programming | "Provides How to use a Win32 build of BusyBox to run many... | Implementation |
| [onboarding](../../skills/programming/onboarding/SKILL.md) | Programming | "Provides Generate two complementary onboarding documents... | Implementation |
| [open-policy-agent-opa](../../skills/cncf/open-policy-agent-opa/SKILL.md) | Cncf | "Open Policy Agent in Security &amp; Compliance - cloud... | Reference |
| [open-telemetry](../../skills/cncf/open-telemetry/SKILL.md) | Cncf | "OpenTelemetry in Observability - cloud native... | Reference |
| [opencost](../../skills/cncf/opencost/SKILL.md) | Cncf | "OpenCost in Kubernetes Cost Monitoring - cloud native... | Reference |
| [openfeature](../../skills/cncf/openfeature/SKILL.md) | Cncf | "OpenFeature in Feature Flagging - cloud native... | Reference |
| [openfga](../../skills/cncf/openfga/SKILL.md) | Cncf | "OpenFGA in Security &amp; Compliance - cloud native... | Reference |
| [openkruise](../../skills/cncf/openkruise/SKILL.md) | Cncf | "OpenKruise in Extended Kubernetes workload management with... | Reference |
| [opentelemetry](../../skills/cncf/opentelemetry/SKILL.md) | Cncf | "OpenTelemetry in Observability framework for tracing,... | Reference |
| [openyurt](../../skills/cncf/openyurt/SKILL.md) | Cncf | ''Provides OpenYurt in Extending Kubernetes to edge... | Reference |
| [operator-framework](../../skills/cncf/operator-framework/SKILL.md) | Cncf | "Operator Framework in Tools to build and manage Kubernetes... | Reference |
| [ops](../../skills/programming/ops/SKILL.md) | Programming | Provides LLM Operations -- RAG, embeddings, vector... | Implementation |
| [optimization](../../skills/agent/optimization/SKILL.md) | Agent | Provides PostgreSQL database optimization workflow for... | Implementation |
| [optimization](../../skills/cncf/optimization/SKILL.md) | Cncf | "Provides Strategies and patterns for optimizing cloud... | Implementation |
| [optimization](../../skills/programming/optimization/SKILL.md) | Programming | Provides Context optimization extends the effective... | Implementation |
| [optimization](../../skills/programming/optimization/SKILL.md) | Programming | Provides Optimize Apache Spark jobs with partitioning,... | Implementation |
| [optimization-patterns](../../skills/cncf/optimization-patterns/SKILL.md) | Cncf | Provides Transform slow database queries into... | Implementation |
| [optimizer](../../skills/agent/optimizer/SKILL.md) | Agent | Provides Diagnose and optimize Agent Skills (SKILL.md) with... | Implementation |
| [optimizer](../../skills/agent/optimizer/SKILL.md) | Agent | 'Provides Adaptive token optimizer: intelligent filtering,... | Implementation |
| [optimizer](../../skills/cncf/optimizer/SKILL.md) | Cncf | Provides Expert database optimizer specializing in modern... | Implementation |
| [optimizer](../../skills/programming/optimizer/SKILL.md) | Programming | "Provides Developer Experience specialist. Improves... | Implementation |
| [optimizer](../../skills/programming/optimizer/SKILL.md) | Programming | Provides Identifies and fixes performance bottlenecks in... | Implementation |
| [option-ref](../../skills/programming/option-ref/SKILL.md) | Programming | Provides Quick reference for Option type. Use when user... | Implementation |
| [orchestration](../../skills/coding/orchestration/SKILL.md) | Coding | "Provides Patterns for managing distributed transactions... | Implementation |
| [orchestration](../../skills/programming/orchestration/SKILL.md) | Programming | "Orchestrates design workflows by routing work through... | Implementation |
| [orchestration-improve-agent](../../skills/programming/orchestration-improve-agent/SKILL.md) | Programming | Provides Systematic improvement of existing agents through... | Implementation |
| [orchestration-multi-agent-optimize](../../skills/programming/orchestration-multi-agent-optimize/SKILL.md) | Programming | Provides Optimize multi-agent systems with coordinated... | Implementation |
| [orchestration-patterns](../../skills/agent/orchestration-patterns/SKILL.md) | Agent | "Provides Master workflow orchestration architecture with... | Orchestration |
| [orchestrator](../../skills/agent/orchestrator/SKILL.md) | Agent | "Provides use when a coding task should be driven... | Orchestration |
| [orchestrator](../../skills/coding/orchestrator/SKILL.md) | Coding | "Provides Master TDD orchestrator specializing in... | Review |
| [orchestrator](../../skills/programming/orchestrator/SKILL.md) | Programming | Provides Meta-skill que orquestra todos os agentes do... | Implementation |
| [orchestrator](../../skills/programming/orchestrator/SKILL.md) | Programming | "Provides Orquestrador unificado de canais sociais —... | Implementation |
| [organizer](../../skills/programming/organizer/SKILL.md) | Programming | 'Provides 6. Reduces Clutter: Identifies old files you... | Implementation |
| [orm-expert](../../skills/cncf/orm-expert/SKILL.md) | Cncf | "Provides Expert in Drizzle ORM for TypeScript — schema... | Implementation |
| [orm-expert](../../skills/programming/orm-expert/SKILL.md) | Programming | 'Provides Master Odoo ORM patterns: search, browse, create,... | Implementation |
| [ory-hydra](../../skills/cncf/ory-hydra/SKILL.md) | Cncf | "ORY Hydra in Security & Compliance - cloud native... | Reference |
| [ory-kratos](../../skills/cncf/ory-kratos/SKILL.md) | Cncf | "ORY Kratos in Identity & Access - cloud native... | Reference |
| [os](../../skills/programming/os/SKILL.md) | Programming | "Provides Five-phase pipeline (triage → clarify → research ... | Implementation |
| [output-enforcement](../../skills/coding/output-enforcement/SKILL.md) | Coding | "Provides use when a task requires exhaustive unabridged... | Implementation |
| [package-manager](../../skills/programming/package-manager/SKILL.md) | Programming | "Provides Comprehensive guide to using uv, an extremely... | Implementation |
| [packaging](../../skills/programming/packaging/SKILL.md) | Programming | "Provides Comprehensive guide to creating, structuring, and... | Implementation |
| [page](../../skills/programming/page/SKILL.md) | Programming | "Provides Deep single-page SEO analysis covering on-page... | Implementation |
| [page](../../skills/programming/page/SKILL.md) | Programming | "Provides Scaffold a new mobile-first page using StyleSeed... | Implementation |
| [page-generator](../../skills/coding/page-generator/SKILL.md) | Coding | "Generates high-converting Next.js/React landing pages with... | Implementation |
| [page-writer](../../skills/programming/page-writer/SKILL.md) | Programming | "Provides You are a senior documentation engineer that... | Implementation |
| [paper-commission-model](../../skills/trading/paper-commission-model/SKILL.md) | Trading | "Implements commission model and fee structure simulation... | Implementation |
| [paper-conversion](../../skills/programming/paper-conversion/SKILL.md) | Programming | "Provides this skill should be used when the user asks to... | Implementation |
| [paper-fill-simulation](../../skills/trading/paper-fill-simulation/SKILL.md) | Trading | "Implements fill simulation models for order execution... | Implementation |
| [paper-market-impact](../../skills/trading/paper-market-impact/SKILL.md) | Trading | "Implements market impact modeling and order book... | Implementation |
| [paper-performance-attribution](../../skills/trading/paper-performance-attribution/SKILL.md) | Trading | "Provides Performance Attribution Systems for Trading... | Implementation |
| [paper-realistic-simulation](../../skills/trading/paper-realistic-simulation/SKILL.md) | Trading | "Provides Realistic Paper Trading Simulation with Market... | Implementation |
| [paper-slippage-model](../../skills/trading/paper-slippage-model/SKILL.md) | Trading | "Implements slippage modeling and execution simulation for... | Implementation |
| [parallel-agents](../../skills/agent/parallel-agents/SKILL.md) | Agent | Provides use when facing 2+ independent tasks that can be... | Implementation |
| [parallel-skill-runner](../../skills/agent/parallel-skill-runner/SKILL.md) | Agent | "Executes multiple skill specifications concurrently,... | Orchestration |
| [path-traversal](../../skills/coding/path-traversal/SKILL.md) | Coding | "Provides Identify and exploit file path traversal... | Review |
| [pattern](../../skills/programming/pattern/SKILL.md) | Programming | "Provides Generate reusable UI patterns such as card... | Implementation |
| [patterns](../../skills/agent/patterns/SKILL.md) | Agent | "Provides use this skill when implementing tasks according... | Orchestration |
| [patterns](../../skills/cncf/patterns/SKILL.md) | Cncf | "Provides Common AWS CDK patterns and constructs for... | Implementation |
| [patterns](../../skills/coding/patterns/SKILL.md) | Coding | "Provides API design principles and decision-making. REST... | Implementation |
| [patterns](../../skills/coding/patterns/SKILL.md) | Coding | Provides Master proven backend architecture patterns... | Implementation |
| [patterns](../../skills/coding/patterns/SKILL.md) | Coding | Provides Master microservices architecture patterns... | Implementation |
| [patterns](../../skills/coding/patterns/SKILL.md) | Coding | "Provides Build read models and projections from event... | Implementation |
| [patterns](../../skills/coding/patterns/SKILL.md) | Coding | "Provides Modern React patterns and principles. Hooks,... | Implementation |
| [patterns](../../skills/coding/patterns/SKILL.md) | Coding | "Provides Tailwind CSS v4 principles. CSS-first... | Implementation |
| [patterns](../../skills/coding/patterns/SKILL.md) | Coding | "Provides Jest testing patterns, factory functions, mocking... | Review |
| [patterns](../../skills/programming/patterns/SKILL.md) | Programming | "Provides Apple Human Interface Guidelines interaction and... | Implementation |
| [patterns](../../skills/programming/patterns/SKILL.md) | Programming | Provides Production patterns for Linkerd service mesh - the... | Implementation |
| [patterns](../../skills/programming/patterns/SKILL.md) | Programming | "Provides Python development principles and... | Implementation |
| [payments-stack](../../skills/cncf/payments-stack/SKILL.md) | Cncf | "Provides Design and implement production-grade Pakistani... | Implementation |
| [penetration-testing](../../skills/cncf/penetration-testing/SKILL.md) | Cncf | Provides Provide comprehensive techniques for penetration... | Implementation |
| [penetration-testing](../../skills/cncf/penetration-testing/SKILL.md) | Cncf | Provides Conduct comprehensive security assessments of... | Implementation |
| [penetration-testing](../../skills/coding/penetration-testing/SKILL.md) | Coding | Provides Conduct comprehensive security assessments of SMTP... | Review |
| [penetration-testing](../../skills/coding/penetration-testing/SKILL.md) | Coding | Provides Conduct comprehensive SSH security assessments... | Review |
| [penetration-testing](../../skills/coding/penetration-testing/SKILL.md) | Coding | Provides Assess WordPress installations for common... | Review |
| [perception-psychologist](../../skills/programming/perception-psychologist/SKILL.md) | Programming | "Provides one sentence - what this skill does and when to... | Implementation |
| [perf-review](../../skills/coding/perf-review/SKILL.md) | Coding | "Implements django performance code review. use when asked... | Implementation |
| [performance-audit](../../skills/programming/performance-audit/SKILL.md) | Programming | Provides Audit SwiftUI performance issues from code review... | Implementation |
| [performance-optimization](../../skills/coding/performance-optimization/SKILL.md) | Coding | Provides Optimize website and web application performance... | Implementation |
| [performance-optimization](../../skills/programming/performance-optimization/SKILL.md) | Programming | Provides Profile and optimize Python code using cProfile,... | Implementation |
| [performance-performance-optimization](../../skills/cncf/performance-performance-optimization/SKILL.md) | Cncf | Provides Optimize end-to-end application performance with... | Implementation |
| [performance-profiler](../../skills/agent/performance-profiler/SKILL.md) | Agent | "Profiles code execution to identify performance... | Debugging |
| [performance-tuner](../../skills/programming/performance-tuner/SKILL.md) | Programming | 'Provides Expert guide for diagnosing and fixing Odoo... | Implementation |
| [persuasion-engineer](../../skills/programming/persuasion-engineer/SKILL.md) | Programming | "Provides one sentence - what this skill does and when to... | Implementation |
| [pipe-ref](../../skills/programming/pipe-ref/SKILL.md) | Programming | Provides Quick reference for pipe and flow. Use when user... | Implementation |
| [pipeline-design](../../skills/cncf/pipeline-design/SKILL.md) | Cncf | Provides Architecture patterns for multi-stage CI/CD... | Implementation |
| [pipeline-workflow](../../skills/agent/pipeline-workflow/SKILL.md) | Agent | "Provides Complete end-to-end MLOps pipeline orchestration... | Orchestration |
| [plan](../../skills/programming/plan/SKILL.md) | Programming | "Provides Strategic SEO planning for new or existing... | Implementation |
| [planning](../../skills/agent/planning/SKILL.md) | Agent | "Provides use when a user asks for a plan for a coding... | Orchestration |
| [plans](../../skills/agent/plans/SKILL.md) | Agent | "Provides use when you have a written implementation plan... | Orchestration |
| [plans](../../skills/agent/plans/SKILL.md) | Agent | "Provides use when you have a spec or requirements for a... | Orchestration |
| [platform](../../skills/programming/platform/SKILL.md) | Programming | Provides Platform APIs for model management, pricing, and... | Implementation |
| [platform](../../skills/programming/platform/SKILL.md) | Programming | "CRITICAL: Use for Makepad cross-platform support. Triggers... | Implementation |
| [platform-apps-multi-platform](../../skills/programming/platform-apps-multi-platform/SKILL.md) | Programming | "Provides Build and deploy the same feature consistently... | Implementation |
| [platforms](../../skills/programming/platforms/SKILL.md) | Programming | "Provides Apple Human Interface Guidelines for... | Implementation |
| [playwright](../../skills/coding/playwright/SKILL.md) | Coding | Provides Expert capability for robust, stealthy, and... | Review |
| [plotly](../../skills/programming/plotly/SKILL.md) | Programming | Provides Interactive visualization library. Use when you... | Implementation |
| [plugin-development](../../skills/agent/plugin-development/SKILL.md) | Agent | "Provides WordPress plugin development workflow covering... | Implementation |
| [polars](../../skills/programming/polars/SKILL.md) | Programming | Provides Fast in-memory DataFrame library for datasets that... | Implementation |
| [portfolio](../../skills/coding/portfolio/SKILL.md) | Coding | "Provides Expert in building portfolios that actually land... | Implementation |
| [post-writer-seo](../../skills/programming/post-writer-seo/SKILL.md) | Programming | "Provides Social Media Strategist and Content Writer.... | Implementation |
| [postgres](../../skills/cncf/postgres/SKILL.md) | Cncf | Provides Provision instant temporary Postgres databases via... | Implementation |
| [postgres](../../skills/cncf/postgres/SKILL.md) | Cncf | Provides Expert patterns for Neon serverless Postgres,... | Implementation |
| [postgres-ts](../../skills/cncf/postgres-ts/SKILL.md) | Cncf | Provides Connect to Azure Database for PostgreSQL Flexible... | Implementation |
| [postgresql](../../skills/cncf/postgresql/SKILL.md) | Cncf | Provides Design a PostgreSQL-specific schema. Covers... | Implementation |
| [postprocessing](../../skills/programming/postprocessing/SKILL.md) | Programming | "Provides Three.js post-processing - EffectComposer, bloom,... | Implementation |
| [ppt-skills](../../skills/programming/ppt-skills/SKILL.md) | Programming | "Provides AI-powered PPT generation with document analysis... | Implementation |
| [pptx-generator](../../skills/programming/pptx-generator/SKILL.md) | Programming | "Provides Generate complete Python scripts that build... | Implementation |
| [pr](../../skills/agent/pr/SKILL.md) | Agent | "Provides Alias for sentry-skills:pr-writer. Use when users... | Orchestration |
| [pr](../../skills/agent/pr/SKILL.md) | Agent | "Provides Iterate on a PR until CI passes. Use when you... | Orchestration |
| [pr-workflows-git-workflow](../../skills/agent/pr-workflows-git-workflow/SKILL.md) | Agent | "Provides Orchestrate a comprehensive git workflow from... | Orchestration |
| [pr-workflows-onboard](../../skills/agent/pr-workflows-onboard/SKILL.md) | Agent | "Provides You are an **expert onboarding specialist and... | Orchestration |
| [pr-workflows-pr-enhance](../../skills/agent/pr-workflows-pr-enhance/SKILL.md) | Agent | "Provides You are a PR optimization expert specializing in... | Orchestration |
| [pragmatic](../../skills/programming/pragmatic/SKILL.md) | Programming | "Provides a practical, jargon-free guide to functional... | Implementation |
| [preemptor](../../skills/programming/preemptor/SKILL.md) | Programming | "Provides one sentence - what this skill does and when to... | Implementation |
| [prevention](../../skills/programming/prevention/SKILL.md) | Programming | "Provides Reduce voluntary and involuntary churn with... | Implementation |
| [principles](../../skills/programming/principles/SKILL.md) | Programming | "Provides Evaluate interfaces against 168 research-backed... | Implementation |
| [privilege-escalation](../../skills/coding/privilege-escalation/SKILL.md) | Coding | "Provides Execute systematic privilege escalation... | Review |
| [privilege-escalation](../../skills/coding/privilege-escalation/SKILL.md) | Coding | "Provides Provide systematic methodologies for discovering... | Review |
| [pro](../../skills/coding/pro/SKILL.md) | Coding | "Provides Write efficient C code with proper memory... | Implementation |
| [pro](../../skills/coding/pro/SKILL.md) | Coding | "Provides Write idiomatic C++ code with modern features,... | Implementation |
| [pro](../../skills/coding/pro/SKILL.md) | Coding | "Provides Write modern C# code with advanced features like... | Implementation |
| [pro](../../skills/coding/pro/SKILL.md) | Coding | "Provides Master Django 5.x with async views, DRF, Celery,... | Implementation |
| [pro](../../skills/coding/pro/SKILL.md) | Coding | "Provides Write idiomatic Elixir code with OTP patterns,... | Implementation |
| [pro](../../skills/coding/pro/SKILL.md) | Coding | "Provides Build high-performance async APIs with FastAPI,... | Implementation |
| [pro](../../skills/coding/pro/SKILL.md) | Coding | "Provides Master Go 1.21+ with modern patterns, advanced... | Implementation |
| [pro](../../skills/coding/pro/SKILL.md) | Coding | "Provides Expert Haskell engineer specializing in advanced... | Implementation |
| [pro](../../skills/coding/pro/SKILL.md) | Coding | "Provides Master Java 21+ with modern features like virtual... | Implementation |
| [pro](../../skills/coding/pro/SKILL.md) | Coding | "Provides Master modern JavaScript with ES6+, async... | Implementation |
| [pro](../../skills/coding/pro/SKILL.md) | Coding | "Provides Master Julia 1.10+ with modern features,... | Implementation |
| [pro](../../skills/coding/pro/SKILL.md) | Coding | "Write idiomatic PHP code with generators, iterators, SPL... | Implementation |
| [pro](../../skills/coding/pro/SKILL.md) | Coding | "Provides Master Python 3.12+ with modern features, async... | Implementation |
| [pro](../../skills/coding/pro/SKILL.md) | Coding | "Provides Write idiomatic Ruby code with metaprogramming,... | Implementation |
| [pro](../../skills/coding/pro/SKILL.md) | Coding | "Provides Master Rust 1.75+ with modern async patterns,... | Implementation |
| [pro](../../skills/coding/pro/SKILL.md) | Coding | Provides Master enterprise-grade Scala development with... | Implementation |
| [pro](../../skills/coding/pro/SKILL.md) | Coding | "Provides Master TypeScript with advanced types, generics,... | Implementation |
| [pro](../../skills/programming/pro/SKILL.md) | Programming | "Master of defensive Bash scripting for production... | Implementation |
| [pro](../../skills/programming/pro/SKILL.md) | Programming | "Provides Professional, ethical HR partner for hiring,... | Implementation |
| [pro](../../skills/programming/pro/SKILL.md) | Programming | Provides Master modern SQL with cloud-native databases,... | Implementation |
| [procedures](../../skills/cncf/procedures/SKILL.md) | Cncf | Provides Production deployment principles and... | Implementation |
| [process-architecture](../../skills/cncf/process-architecture/SKILL.md) | Cncf | "Creates or updates ARCHITECTURE.md documenting the... | Reference |
| [process-incident-response](../../skills/cncf/process-incident-response/SKILL.md) | Cncf | "Creates or updates an incident response plan covering... | Reference |
| [process-releases](../../skills/cncf/process-releases/SKILL.md) | Cncf | "Creates or updates RELEASES.md documenting the release... | Reference |
| [process-security-policy](../../skills/cncf/process-security-policy/SKILL.md) | Cncf | "Creates or updates SECURITY.md defining the vulnerability... | Reference |
| [procurement](../../skills/programming/procurement/SKILL.md) | Programming | "Provides Codified expertise for electricity and gas... | Implementation |
| [product](../../skills/programming/product/SKILL.md) | Programming | Provides Every product will be AI-powered. The question is... | Implementation |
| [product](../../skills/programming/product/SKILL.md) | Programming | "Provides Analytics de produto — PostHog, Mixpanel,... | Implementation |
| [productivity](../../skills/programming/productivity/SKILL.md) | Programming | "Provides Office productivity workflow covering document... | Implementation |
| [profile-optimizer](../../skills/programming/profile-optimizer/SKILL.md) | Programming | "Provides High-intent expert for LinkedIn profile checks,... | Implementation |
| [profiling](../../skills/programming/profiling/SKILL.md) | Programming | Provides Performance profiling principles. Measurement,... | Implementation |
| [program](../../skills/programming/program/SKILL.md) | Programming | Provides You are an expert in viral growth and referral... | Implementation |
| [programmatic](../../skills/programming/programmatic/SKILL.md) | Programming | Provides Plan and audit programmatic SEO pages generated at... | Implementation |
| [programming-glsl](../../skills/programming/programming-glsl/SKILL.md) | Programming | "Provides Expert guide for writing efficient GLSL shaders... | Implementation |
| [programming-rust-project](../../skills/programming/programming-rust-project/SKILL.md) | Programming | "Provides You are a Rust project architecture expert... | Implementation |
| [project](../../skills/agent/project/SKILL.md) | Agent | "Provides Forensic root cause analyzer for Antigravity... | Implementation |
| [project-context](../../skills/programming/project-context/SKILL.md) | Programming | "Provides Create or update a shared Apple design context... | Implementation |
| [project-organizer](../../skills/programming/project-organizer/SKILL.md) | Programming | "Provides Take a list of projects and their related... | Implementation |
| [project-parser](../../skills/coding/project-parser/SKILL.md) | Coding | "Provides Searches and explores Burp Suite project files... | Review |
| [project-timesheet](../../skills/programming/project-timesheet/SKILL.md) | Programming | 'Provides Expert guide for Odoo Project and Timesheets:... | Implementation |
| [prometheus](../../skills/cncf/prometheus/SKILL.md) | Cncf | "Prometheus in Cloud-Native Engineering - The Prometheus... | Reference |
| [prompt](../../skills/programming/prompt/SKILL.md) | Programming | "Transforms vague UI ideas into polished, Stitch-optimized... | Implementation |
| [prompt-optimizer](../../skills/programming/prompt-optimizer/SKILL.md) | Programming | Provides use when improving prompts for any llm. applies... | Implementation |
| [proof-architect](../../skills/programming/proof-architect/SKILL.md) | Programming | "Provides one sentence - what this skill does and when to... | Implementation |
| [proofreader](../../skills/programming/proofreader/SKILL.md) | Programming | "Provides use when a user asks to functionality and... | Implementation |
| [prose](../../skills/programming/prose/SKILL.md) | Programming | "Provides a hard-edged writing style contract for timeless,... | Implementation |
| [protocol-templates](../../skills/programming/protocol-templates/SKILL.md) | Programming | "Provides Implement DeFi protocols with production-ready... | Implementation |
| [psychographic-profiler](../../skills/programming/psychographic-profiler/SKILL.md) | Programming | "Provides one sentence - what this skill does and when to... | Implementation |
| [psychologist](../../skills/programming/psychologist/SKILL.md) | Programming | "Provides one sentence - what this skill does and when to... | Implementation |
| [psychologist](../../skills/programming/psychologist/SKILL.md) | Programming | "Provides one sentence - what this skill does and when to... | Implementation |
| [psychologist](../../skills/programming/psychologist/SKILL.md) | Programming | "Provides one sentence - what this skill does and when to... | Implementation |
| [psychologist](../../skills/programming/psychologist/SKILL.md) | Programming | "Provides one sentence - what this skill does and when to... | Implementation |
| [psychologist](../../skills/programming/psychologist/SKILL.md) | Programming | "Provides one sentence - what this skill does and when to... | Implementation |
| [psychology](../../skills/programming/psychology/SKILL.md) | Programming | "Provides Apply behavioral science and mental models to... | Implementation |
| [psychology-strategist](../../skills/programming/psychology-strategist/SKILL.md) | Programming | "Provides one sentence - what this skill does and when to... | Implementation |
| [purchase-workflow](../../skills/programming/purchase-workflow/SKILL.md) | Programming | "Provides Expert guide for Odoo Purchase: RFQ → PO →... | Implementation |
| [pushing](../../skills/agent/pushing/SKILL.md) | Agent | "Provides Stage all changes, create a conventional commit,... | Orchestration |
| [pydantic-config](../../skills/coding/pydantic-config/SKILL.md) | Coding | "Pydantic-based configuration management with frozen... | Implementation |
| [pydantic-models](../../skills/coding/pydantic-models/SKILL.md) | Coding | "'Pydantic frozen data models for trading: enums, annotated... | Implementation |
| [python](../../skills/programming/python/SKILL.md) | Programming | "Provides Guide for building reliable, fault-tolerant... | Implementation |
| [python-patterns](../../skills/programming/python-patterns/SKILL.md) | Programming | "Provides Comprehensive guidance for implementing... | Implementation |
| [python-pro](../../skills/agent/python-pro/SKILL.md) | Agent | "Provides Master Temporal workflow orchestration with... | Orchestration |
| [python-testing](../../skills/coding/python-testing/SKILL.md) | Coding | "Provides Comprehensive testing approaches for Temporal... | Review |
| [qa](../../skills/agent/qa/SKILL.md) | Agent | Provides Comprehensive testing and QA workflow covering... | Implementation |
| [qa](../../skills/programming/qa/SKILL.md) | Programming | "Provides Answer repository questions grounded entirely in... | Implementation |
| [qiskit](../../skills/programming/qiskit/SKILL.md) | Programming | "Provides Qiskit is the world's most popular open-source... | Implementation |
| [qstash](../../skills/agent/qstash/SKILL.md) | Agent | "Provides Upstash QStash expert for serverless message... | Orchestration |
| [quality-frameworks](../../skills/programming/quality-frameworks/SKILL.md) | Programming | "Provides Implement data quality validation with Great... | Implementation |
| [query-expert](../../skills/coding/query-expert/SKILL.md) | Coding | "Provides Expert in TanStack Query (React Query) —... | Implementation |
| [query-optimizer](../../skills/agent/query-optimizer/SKILL.md) | Agent | "Analyzes and optimizes database queries for performance,... | Optimization |
| [questions-if-underspecified](../../skills/agent/questions-if-underspecified/SKILL.md) | Agent | "Provides Clarify requirements before implementing. Use... | Orchestration |
| [qweb-templates](../../skills/programming/qweb-templates/SKILL.md) | Programming | "Provides Expert in Odoo QWeb templating for PDF reports,... | Implementation |
| [rails-project](../../skills/programming/rails-project/SKILL.md) | Programming | "Provides create a new rails project functionality and... | Implementation |
| [rails-upgrade](../../skills/agent/rails-upgrade/SKILL.md) | Agent | "Implements analyze rails apps and provide upgrade... | Implementation |
| [react](../../skills/programming/react/SKILL.md) | Programming | Provides Practical patterns for using fp-ts with React -... | Implementation |
| [reader-testing](../../skills/coding/reader-testing/SKILL.md) | Coding | "Provides Practical guide to testing web applications with... | Review |
| [readme](../../skills/programming/readme/SKILL.md) | Programming | "Provides You are an expert technical writer creating... | Implementation |
| [recallmax](../../skills/agent/recallmax/SKILL.md) | Agent | "Provides FREE — God-tier long-context memory for AI... | Implementation |
| [reconnaissance](../../skills/coding/reconnaissance/SKILL.md) | Coding | "Provides Provide systematic methodologies for leveraging... | Review |
| [refactor](../../skills/programming/refactor/SKILL.md) | Programming | "Provides Comprehensive guide for refactoring imperative... | Implementation |
| [refactoring-context-restore](../../skills/programming/refactoring-context-restore/SKILL.md) | Programming | Provides use when working with code refactoring context... | Implementation |
| [refactoring-refactor-clean](../../skills/coding/refactoring-refactor-clean/SKILL.md) | Coding | Provides You are a code refactoring expert specializing in... | Review |
| [refactoring-tech-debt](../../skills/programming/refactoring-tech-debt/SKILL.md) | Programming | Provides You are a technical debt expert specializing in... | Implementation |
| [reference](../../skills/programming/reference/SKILL.md) | Programming | "Provides this category provides reference materials for... | Implementation |
| [regression-detector](../../skills/agent/regression-detector/SKILL.md) | Agent | "Detects performance and behavioral regressions by... | Quality assurance |
| [relationship-management](../../skills/programming/relationship-management/SKILL.md) | Programming | "Provides Codified expertise for managing carrier... | Implementation |
| [remotion](../../skills/programming/remotion/SKILL.md) | Programming | "Provides Generate walkthrough videos from Stitch projects... | Implementation |
| [requirement-extraction](../../skills/coding/requirement-extraction/SKILL.md) | Coding | "Provides Derive security requirements from threat models... | Review |
| [research](../../skills/programming/research/SKILL.md) | Programming | Provides Run autonomous research tasks that plan, search,... | Implementation |
| [researcher](../../skills/programming/researcher/SKILL.md) | Programming | "Provides You are an expert software engineer and systems... | Implementation |
| [resource-manager-cosmosdb-dotnet](../../skills/cncf/resource-manager-cosmosdb-dotnet/SKILL.md) | Cncf | "Configures azure resource manager sdk for cosmos db in... | Implementation |
| [resource-manager-durabletask-dotnet](../../skills/cncf/resource-manager-durabletask-dotnet/SKILL.md) | Cncf | "Provides Azure Resource Manager SDK for Durable Task... | Implementation |
| [resource-manager-mysql-dotnet](../../skills/cncf/resource-manager-mysql-dotnet/SKILL.md) | Cncf | Provides Azure MySQL Flexible Server SDK for .NET. Database... | Implementation |
| [resource-manager-playwright-dotnet](../../skills/cncf/resource-manager-playwright-dotnet/SKILL.md) | Cncf | "Provides Azure Resource Manager SDK for Microsoft... | Implementation |
| [resource-manager-postgresql-dotnet](../../skills/cncf/resource-manager-postgresql-dotnet/SKILL.md) | Cncf | Provides Azure PostgreSQL Flexible Server SDK for .NET.... | Implementation |
| [resource-manager-redis-dotnet](../../skills/cncf/resource-manager-redis-dotnet/SKILL.md) | Cncf | Configures azure resource manager sdk for redis in .net for... | Implementation |
| [resource-manager-sql-dotnet](../../skills/cncf/resource-manager-sql-dotnet/SKILL.md) | Cncf | "Configures azure resource manager sdk for azure sql in... | Implementation |
| [resource-optimizer](../../skills/agent/resource-optimizer/SKILL.md) | Agent | "Optimizes resource allocation across distributed systems... | Optimization |
| [responder](../../skills/cncf/responder/SKILL.md) | Cncf | Provides Expert SRE incident responder specializing in... | Implementation |
| [response-incident-response](../../skills/cncf/response-incident-response/SKILL.md) | Cncf | "Configures use when working with incident response... | Implementation |
| [response-smart-fix](../../skills/cncf/response-smart-fix/SKILL.md) | Cncf | 'Provides [Extended thinking: This workflow implements a... | Implementation |
| [reverse-engineering](../../skills/coding/reverse-engineering/SKILL.md) | Coding | "Provides Comprehensive techniques for capturing,... | Review |
| [reverse-logistics](../../skills/programming/reverse-logistics/SKILL.md) | Programming | "Provides Codified expertise for returns authorisation,... | Implementation |
| [reversing-techniques](../../skills/coding/reversing-techniques/SKILL.md) | Coding | 'Provides AUTHORIZED USE ONLY: This skill contains dual-use... | Review |
| [revert](../../skills/agent/revert/SKILL.md) | Agent | "Implements git-aware undo by logical work unit (track,... | Orchestration |
| [review](../../skills/coding/review/SKILL.md) | Coding | "Provides Master software architect specializing in modern... | Implementation |
| [review](../../skills/coding/review/SKILL.md) | Coding | "Provides Professional code review with auto CHANGELOG... | Review |
| [review](../../skills/coding/review/SKILL.md) | Coding | "Implements security-focused code review for prs, commits,... | Review |
| [review](../../skills/coding/review/SKILL.md) | Coding | "Implements verify fix commits address audit findings... | Review |
| [review](../../skills/programming/review/SKILL.md) | Programming | "Provides Review UI code for StyleSeed design-system... | Implementation |
| [review-ai-ai-review](../../skills/programming/review-ai-ai-review/SKILL.md) | Programming | "Provides You are an expert AI-powered code review... | Implementation |
| [review-checklist](../../skills/coding/review-checklist/SKILL.md) | Coding | "Provides Comprehensive checklist for conducting thorough... | Review |
| [review-excellence](../../skills/programming/review-excellence/SKILL.md) | Programming | "Provides Transform code reviews from gatekeeping to... | Implementation |
| [review-full-review](../../skills/coding/review-full-review/SKILL.md) | Coding | "Implements use when working with comprehensive review full... | Review |
| [review-pr-enhance](../../skills/coding/review-pr-enhance/SKILL.md) | Coding | "Provides Generate structured PR descriptions from diffs,... | Review |
| [review-requests](../../skills/agent/review-requests/SKILL.md) | Agent | "Provides Fetch unread GitHub notifications for open PRs... | Orchestration |
| [reviewer](../../skills/programming/reviewer/SKILL.md) | Programming | "Provides Elite code review expert specializing in modern... | Implementation |
| [revops](../../skills/programming/revops/SKILL.md) | Programming | "Provides Design and improve revenue operations, lead... | Implementation |
| [risco](../../skills/programming/risco/SKILL.md) | Programming | "Provides Analise de risco em leiloes de imoveis. Score 36... | Implementation |
| [risk-correlation-risk](../../skills/trading/risk-correlation-risk/SKILL.md) | Trading | "Implements correlation breakdown and portfolio... | Implementation |
| [risk-drawdown-control](../../skills/trading/risk-drawdown-control/SKILL.md) | Trading | "Implements maximum drawdown control and equity... | Implementation |
| [risk-kill-switches](../../skills/trading/risk-kill-switches/SKILL.md) | Trading | "Implementing multi-layered kill switches at account,... | Implementation |
| [risk-liquidity-risk](../../skills/trading/risk-liquidity-risk/SKILL.md) | Trading | "Implements liquidity assessment and trade execution risk... | Implementation |
| [risk-position-sizing](../../skills/trading/risk-position-sizing/SKILL.md) | Trading | "Calculating optimal position sizes using Kelly criterion,... | Implementation |
| [risk-stop-loss](../../skills/trading/risk-stop-loss/SKILL.md) | Trading | "Implements stop loss strategies for risk management for... | Implementation |
| [risk-stress-testing](../../skills/trading/risk-stress-testing/SKILL.md) | Trading | "Implements stress test scenarios and portfolio resilience... | Implementation |
| [risk-tail-risk](../../skills/trading/risk-tail-risk/SKILL.md) | Trading | "Implements tail risk management and extreme event... | Implementation |
| [risk-value-at-risk](../../skills/trading/risk-value-at-risk/SKILL.md) | Trading | "Implements value at risk calculations for portfolio risk... | Implementation |
| [rod-master](../../skills/programming/rod-master/SKILL.md) | Programming | "Provides Comprehensive guide for browser automation and... | Implementation |
| [rook](../../skills/cncf/rook/SKILL.md) | Cncf | "Configures rook in cloud-native storage orchestration for... | Reference |
| [router](../../skills/agent/router/SKILL.md) | Agent | "Provides use when the user is unsure which skill to use or... | Implementation |
| [router-py](../../skills/coding/router-py/SKILL.md) | Coding | "Provides Create FastAPI routers following established... | Implementation |
| [rpc-api](../../skills/programming/rpc-api/SKILL.md) | Programming | "Provides Expert on Odoo's external JSON-RPC and XML-RPC... | Implementation |
| [rule-creator](../../skills/coding/rule-creator/SKILL.md) | Coding | "Creates custom Semgrep rules for detecting security... | Review |
| [rule-variant-creator](../../skills/coding/rule-variant-creator/SKILL.md) | Coding | "Creates language variants of existing Semgrep rules. Use... | Review |
| [runbook-templates](../../skills/cncf/runbook-templates/SKILL.md) | Cncf | "Provides Production-ready templates for incident response... | Implementation |
| [runtime-log-analyzer](../../skills/agent/runtime-log-analyzer/SKILL.md) | Agent | "Analyzes runtime logs from agent execution to identify... | Monitoring |
| [saas-launcher](../../skills/programming/saas-launcher/SKILL.md) | Programming | "Provides Expert in launching small, focused SaaS products... | Implementation |
| [safety-patterns](../../skills/programming/safety-patterns/SKILL.md) | Programming | "Provides Cross-language patterns for memory-safe... | Implementation |
| [sales-crm-expert](../../skills/programming/sales-crm-expert/SKILL.md) | Programming | 'Provides Expert guide for Odoo Sales and CRM: pipeline... | Implementation |
| [satori](../../skills/programming/satori/SKILL.md) | Programming | "Provides Clinically informed wisdom companion blending... | Implementation |
| [scanner](../../skills/agent/scanner/SKILL.md) | Agent | "Provides Scan agent skills for security issues before... | Implementation |
| [scanner](../../skills/coding/scanner/SKILL.md) | Coding | "Provides Advanced vulnerability analysis principles. OWASP... | Review |
| [scanning-security-dependencies](../../skills/coding/scanning-security-dependencies/SKILL.md) | Coding | "Provides You are a security expert specializing in... | Review |
| [scanning-security-hardening](../../skills/coding/scanning-security-hardening/SKILL.md) | Coding | "Provides Coordinate multi-layer security scanning and... | Review |
| [scanning-security-sast](../../skills/coding/scanning-security-sast/SKILL.md) | Coding | "Static Application Security Testing (SAST) for code... | Review |
| [scanpy](../../skills/programming/scanpy/SKILL.md) | Programming | Provides Scanpy is a scalable Python toolkit for analyzing... | Implementation |
| [scheduling](../../skills/programming/scheduling/SKILL.md) | Programming | "Provides Codified expertise for production scheduling, job... | Implementation |
| [schema](../../skills/programming/schema/SKILL.md) | Programming | "Detect, validate, and generate Schema.org structured data.... | Implementation |
| [schema-inference-engine](../../skills/agent/schema-inference-engine/SKILL.md) | Agent | "Inferences data schemas from actual data samples,... | Data |
| [scientific-skills](../../skills/programming/scientific-skills/SKILL.md) | Programming | Provides scientific research and analysis skills... | Implementation |
| [scientist](../../skills/programming/scientist/SKILL.md) | Programming | Provides Expert data scientist for advanced analytics,... | Implementation |
| [scraper](../../skills/programming/scraper/SKILL.md) | Programming | Provides Deep web scraping, screenshots, PDF parsing, and... | Implementation |
| [scraper](../../skills/programming/scraper/SKILL.md) | Programming | Provides Web scraping inteligente multi-estrategia. Extrai... | Implementation |
| [screenshots](../../skills/programming/screenshots/SKILL.md) | Programming | "Provides Generate marketing screenshots of your app using... | Implementation |
| [scripting](../../skills/agent/scripting/SKILL.md) | Agent | "Provides Bash scripting workflow for creating... | Implementation |
| [scripting](../../skills/agent/scripting/SKILL.md) | Agent | "Provides Operating system and shell scripting... | Implementation |
| [sdk](../../skills/coding/sdk/SKILL.md) | Coding | "Provides Build applications that programmatically interact... | Implementation |
| [seaborn](../../skills/programming/seaborn/SKILL.md) | Programming | Provides Seaborn is a Python visualization library for... | Implementation |
| [search](../../skills/cncf/search/SKILL.md) | Cncf | "Provides Expert patterns for Algolia search... | Implementation |
| [search](../../skills/programming/search/SKILL.md) | Programming | Provides Semantic search, similar content discovery, and... | Implementation |
| [search-documents-dotnet](../../skills/cncf/search-documents-dotnet/SKILL.md) | Cncf | "Provides Azure AI Search SDK for .NET... | Implementation |
| [search-documents-py](../../skills/cncf/search-documents-py/SKILL.md) | Cncf | "Provides Azure AI Search SDK for Python. Use for vector... | Implementation |
| [search-documents-ts](../../skills/cncf/search-documents-ts/SKILL.md) | Cncf | "Provides Build search applications with vector, hybrid,... | Implementation |
| [search-implementation](../../skills/programming/search-implementation/SKILL.md) | Programming | Provides Combine vector and keyword search for improved... | Implementation |
| [search-patterns](../../skills/programming/search-patterns/SKILL.md) | Programming | Provides Implement efficient similarity search with vector... | Implementation |
| [secrets-rotation](../../skills/coding/secrets-rotation/SKILL.md) | Coding | "Provides Automate AWS secrets rotation for RDS, API keys,... | Review |
| [secure-release-pipeline](../../skills/coding/secure-release-pipeline/SKILL.md) | Coding | Implements comprehensive secure release pipeline with CVE... | Implementation |
| [security](../../skills/coding/security/SKILL.md) | Coding | "Provides Master smart contract security best practices,... | Review |
| [security-audit](../../skills/coding/security-audit/SKILL.md) | Coding | "Provides Comprehensive AWS security posture assessment... | Review |
| [security-audit](../../skills/coding/security-audit/SKILL.md) | Coding | "Provides Security auditor for Laravel applications.... | Review |
| [security-audit-007](../../skills/coding/security-audit-007/SKILL.md) | Coding | "Provides Security audit, hardening, threat modeling... | Review |
| [security-best-practices](../../skills/coding/security-best-practices/SKILL.md) | Coding | Provides Implement secure API design patterns including... | Implementation |
| [security-coder](../../skills/coding/security-coder/SKILL.md) | Coding | Provides Expert in secure backend coding practices... | Implementation |
| [security-coder](../../skills/coding/security-coder/SKILL.md) | Coding | "Provides Expert in secure frontend coding practices... | Review |
| [security-coder](../../skills/programming/security-coder/SKILL.md) | Programming | Provides Expert in secure mobile coding practices... | Implementation |
| [security-keyvault-keys-dotnet](../../skills/cncf/security-keyvault-keys-dotnet/SKILL.md) | Cncf | Provides Azure Key Vault Keys SDK for .NET. Client library... | Implementation |
| [security-keyvault-keys-java](../../skills/cncf/security-keyvault-keys-java/SKILL.md) | Cncf | Provides Azure Key Vault Keys Java SDK for cryptographic... | Implementation |
| [security-keyvault-secrets-java](../../skills/cncf/security-keyvault-secrets-java/SKILL.md) | Cncf | Provides Azure Key Vault Secrets Java SDK for secret... | Implementation |
| [security-policies](../../skills/cncf/security-policies/SKILL.md) | Cncf | Provides Comprehensive guide for implementing... | Implementation |
| [security-review](../../skills/coding/security-review/SKILL.md) | Coding | "Provides Find exploitable vulnerabilities in GitHub... | Review |
| [security-review](../../skills/coding/security-review/SKILL.md) | Coding | "Security-focused code review identifying vulnerabilities... | Implementation |
| [security-rules](../../skills/programming/security-rules/SKILL.md) | Programming | 'Provides Expert in Odoo access control:... | Implementation |
| [security-testing](../../skills/agent/security-testing/SKILL.md) | Agent | Provides API security testing workflow for REST and GraphQL... | Implementation |
| [security-testing](../../skills/agent/security-testing/SKILL.md) | Agent | Provides Web application security testing workflow for... | Implementation |
| [seekers](../../skills/agent/seekers/SKILL.md) | Agent | "Provides -Automatically convert documentation websites,... | Implementation |
| [self-critique-engine](../../skills/agent/self-critique-engine/SKILL.md) | Agent | "Enables autonomous agents to self-critique their work by... | Quality assurance |
| [semver-automation](../../skills/coding/semver-automation/SKILL.md) | Coding | "Provides Automating semantic versioning in Git... | Implementation |
| [sentinel](../../skills/agent/sentinel/SKILL.md) | Agent | "Provides Auditoria e evolucao do ecossistema de skills.... | Implementation |
| [seo](../../skills/programming/seo/SKILL.md) | Programming | Provides Optimize content for AI search and LLM citations... | Implementation |
| [seo](../../skills/programming/seo/SKILL.md) | Programming | Provides Design and evaluate programmatic SEO strategies... | Implementation |
| [seo](../../skills/programming/seo/SKILL.md) | Programming | "Provides Run a broad SEO audit across technical SEO,... | Implementation |
| [sequence](../../skills/programming/sequence/SKILL.md) | Programming | "Provides You are an expert in email marketing and... | Implementation |
| [serverless](../../skills/cncf/serverless/SKILL.md) | Cncf | "Provides Specialized skill for building production-ready... | Implementation |
| [servicebus-dotnet](../../skills/cncf/servicebus-dotnet/SKILL.md) | Cncf | "Provides Azure Service Bus SDK for .NET. Enterprise... | Implementation |
| [servicebus-py](../../skills/cncf/servicebus-py/SKILL.md) | Cncf | "Provides Azure Service Bus SDK for Python messaging. Use... | Implementation |
| [servicebus-ts](../../skills/cncf/servicebus-ts/SKILL.md) | Cncf | "Configures enterprise messaging with queues, topics, and... | Implementation |
| [settings-audit](../../skills/programming/settings-audit/SKILL.md) | Programming | Provides Analyze a repository to generate recommended... | Implementation |
| [setup](../../skills/agent/setup/SKILL.md) | Agent | "Provides Configure a Rails project to work with Conductor... | Orchestration |
| [setup](../../skills/programming/setup/SKILL.md) | Programming | "Creates devcontainers with Claude Code, language-specific... | Implementation |
| [setup](../../skills/programming/setup/SKILL.md) | Programming | "Provides Interactive StyleSeed setup wizard for choosing... | Implementation |
| [setup-guide](../../skills/programming/setup-guide/SKILL.md) | Programming | "Provides Guide developers through setting up development... | Implementation |
| [shadcn](../../skills/coding/shadcn/SKILL.md) | Coding | "Manages shadcn/ui components and projects, providing... | Implementation |
| [shaders](../../skills/programming/shaders/SKILL.md) | Programming | "CRITICAL: Use for Makepad shader system. Triggers on"... | Implementation |
| [shaders](../../skills/programming/shaders/SKILL.md) | Programming | "Provides Three.js shaders - GLSL, ShaderMaterial,... | Implementation |
| [sheets-automation](../../skills/programming/sheets-automation/SKILL.md) | Programming | "Provides Lightweight Google Sheets integration with... | Implementation |
| [shell-pro](../../skills/programming/shell-pro/SKILL.md) | Programming | "Provides Expert in strict POSIX sh scripting for maximum... | Implementation |
| [shell-reliability](../../skills/programming/shell-reliability/SKILL.md) | Programming | 'Provides Reliable command execution on Windows: paths,... | Implementation |
| [shell-scripting](../../skills/programming/shell-scripting/SKILL.md) | Programming | "Provides Provide production-ready shell script templates... | Implementation |
| [shopify-integration](../../skills/programming/shopify-integration/SKILL.md) | Programming | 'Provides Connect Odoo with Shopify: sync products,... | Implementation |
| [simplifier](../../skills/programming/simplifier/SKILL.md) | Programming | "Provides Simplifies and refines code for clarity,... | Implementation |
| [sitemap](../../skills/programming/sitemap/SKILL.md) | Programming | "Provides Analyze existing XML sitemaps or generate new... | Implementation |
| [sizing-analysis](../../skills/programming/sizing-analysis/SKILL.md) | Programming | "Provides Comprehensive market sizing methodologies for... | Implementation |
| [skill](../../skills/cncf/skill/SKILL.md) | Cncf | Configures terraform infrastructure as code best practices... | Implementation |
| [skill](../../skills/coding/skill/SKILL.md) | Coding | 'Provides IMPORTANT - Path Resolution: This skill can be... | Review |
| [skill](../../skills/coding/skill/SKILL.md) | Coding | "Implements pairwise test generation patterns for software... | Review |
| [skill-audit](../../skills/programming/skill-audit/SKILL.md) | Programming | "Provides Audit a project and recommend the highest-value... | Implementation |
| [skill-backend-patterns](../../skills/agent/skill-backend-patterns/SKILL.md) | Agent | Provides Backend architecture patterns, API design,... | Implementation |
| [skill-clickhouse-io](../../skills/agent/skill-clickhouse-io/SKILL.md) | Agent | Provides ClickHouse database patterns, query optimization,... | Implementation |
| [skill-coding-standards](../../skills/agent/skill-coding-standards/SKILL.md) | Agent | "Provides Universal coding standards, best practices, and... | Implementation |
| [skill-continuous-learning](../../skills/agent/skill-continuous-learning/SKILL.md) | Agent | "Implements development skill from everything-claude-code... | Implementation |
| [skill-frontend-patterns](../../skills/agent/skill-frontend-patterns/SKILL.md) | Agent | "Provides Frontend development patterns for React, Next.js,... | Implementation |
| [skill-orchestrator](../../skills/agent/skill-orchestrator/SKILL.md) | Agent | "Provides a meta-skill that understands task requirements,... | Implementation |
| [skill-project-guidelines-example](../../skills/agent/skill-project-guidelines-example/SKILL.md) | Agent | "Implements project guidelines skill (example) for... | Implementation |
| [skill-security-review](../../skills/agent/skill-security-review/SKILL.md) | Agent | Provides this skill ensures all code follows security best... | Implementation |
| [skill-strategic-compact](../../skills/agent/skill-strategic-compact/SKILL.md) | Agent | "Implements development skill from everything-claude-code... | Implementation |
| [skills](../../skills/agent/skills/SKILL.md) | Agent | "Implements use when creating, updating, or improving agent... | Implementation |
| [skills](../../skills/cncf/skills/SKILL.md) | Cncf | "Provides AWS development with infrastructure automation... | Implementation |
| [skills](../../skills/coding/skills/SKILL.md) | Coding | "Provides Expert security auditor for AI Skills and... | Review |
| [skills](../../skills/programming/skills/SKILL.md) | Programming | 'Provides Makepad UI development skills for Rust apps:... | Implementation |
| [skills](../../skills/programming/skills/SKILL.md) | Programming | Provides Discover, list, create, edit, toggle, copy, move,... | Implementation |
| [skills](../../skills/programming/skills/SKILL.md) | Programming | "Provides Create 3D scenes, interactive experiences, and... | Implementation |
| [skills](../../skills/programming/skills/SKILL.md) | Programming | Provides Opinionated, evolving constraints to guide agents... | Implementation |
| [skills](../../skills/programming/skills/SKILL.md) | Programming | "Provides Upload, stream, search, edit, transcribe, and... | Implementation |
| [slides](../../skills/programming/slides/SKILL.md) | Programming | "Provides Create stunning, animation-rich HTML... | Implementation |
| [slides-automation](../../skills/programming/slides-automation/SKILL.md) | Programming | "Provides Lightweight Google Slides integration with... | Implementation |
| [snippet-hunter](../../skills/programming/snippet-hunter/SKILL.md) | Programming | "Provides Formats content to be eligible for featured... | Implementation |
| [sourcing-architect](../../skills/coding/sourcing-architect/SKILL.md) | Coding | "Provides Expert in event sourcing, CQRS, and event-driven... | Implementation |
| [spec-generation](../../skills/cncf/spec-generation/SKILL.md) | Cncf | "Provides Generate and maintain OpenAPI 3.1 specifications... | Implementation |
| [specialist](../../skills/cncf/specialist/SKILL.md) | Cncf | Provides Expert Terraform/OpenTofu specialist mastering... | Implementation |
| [specialist](../../skills/coding/specialist/SKILL.md) | Coding | "Provides BullMQ expert for Redis-backed job queues,... | Implementation |
| [specialist](../../skills/programming/specialist/SKILL.md) | Programming | "Provides expert web researcher using advanced search... | Implementation |
| [speech-to-text-rest-py](../../skills/cncf/speech-to-text-rest-py/SKILL.md) | Cncf | "Provides Azure Speech to Text REST API for short audio... | Implementation |
| [speed](../../skills/programming/speed/SKILL.md) | Programming | Provides launch rsvp speed reader for text functionality... | Implementation |
| [speed-reader](../../skills/programming/speed-reader/SKILL.md) | Programming | Provides -Speed read Claude's responses at 600+ WPM using... | Implementation |
| [spells](../../skills/programming/spells/SKILL.md) | Programming | "Provides curated micro-interactions and design details... | Implementation |
| [spiffe](../../skills/cncf/spiffe/SKILL.md) | Cncf | "Provides SPIFFE in Secure Product Identity Framework for... | Reference |
| [spire](../../skills/cncf/spire/SKILL.md) | Cncf | "Configures spire in spiffe implementation for real-world... | Reference |
| [splash](../../skills/programming/splash/SKILL.md) | Programming | "CRITICAL: Use for Makepad Splash scripting language.... | Implementation |
| [spm-app-packaging](../../skills/programming/spm-app-packaging/SKILL.md) | Programming | "Provides Scaffold, build, sign, and package SwiftPM macOS... | Implementation |
| [stack-orchestration-full-stack-feature](../../skills/agent/stack-orchestration-full-stack-feature/SKILL.md) | Agent | "Provides use when working with full stack orchestration... | Orchestration |
| [stacktrace-root-cause](../../skills/agent/stacktrace-root-cause/SKILL.md) | Agent | "Performs stacktrace root cause analysis by examining stack... | Diagnosis |
| [stage-mapper](../../skills/programming/stage-mapper/SKILL.md) | Programming | "Provides one sentence - what this skill does and when to... | Implementation |
| [standards](../../skills/programming/standards/SKILL.md) | Programming | Provides Master ERC-721 and ERC-1155 NFT standards,... | Implementation |
| [state-management](../../skills/programming/state-management/SKILL.md) | Programming | "Provides Master modern Angular state management with... | Implementation |
| [state-management](../../skills/programming/state-management/SKILL.md) | Programming | "Provides Master modern React state management with Redux... | Implementation |
| [state-management](../../skills/programming/state-management/SKILL.md) | Programming | ''CRITICAL: Use for Robius state management patterns.... | Reference |
| [statsmodels](../../skills/programming/statsmodels/SKILL.md) | Programming | "Provides Statsmodels is Python's premier library for... | Implementation |
| [status](../../skills/agent/status/SKILL.md) | Agent | "Implements display project status, active tracks, and next... | Orchestration |
| [stock-research](../../skills/programming/stock-research/SKILL.md) | Programming | Provides Thesis-driven equity analysis from public SEC... | Implementation |
| [storage-blob-java](../../skills/cncf/storage-blob-java/SKILL.md) | Cncf | "Provides Build blob storage applications using the Azure... | Implementation |
| [storage-blob-py](../../skills/cncf/storage-blob-py/SKILL.md) | Cncf | "Provides Azure Blob Storage SDK for Python. Use for... | Implementation |
| [storage-blob-rust](../../skills/cncf/storage-blob-rust/SKILL.md) | Cncf | "Provides Azure Blob Storage SDK for Rust. Use for... | Implementation |
| [storage-blob-ts](../../skills/cncf/storage-blob-ts/SKILL.md) | Cncf | "Provides Azure Blob Storage JavaScript/TypeScript SDK... | Implementation |
| [storage-file-datalake-py](../../skills/cncf/storage-file-datalake-py/SKILL.md) | Cncf | Provides Azure Data Lake Storage Gen2 SDK for Python. Use... | Implementation |
| [storage-file-share-py](../../skills/cncf/storage-file-share-py/SKILL.md) | Cncf | "Provides Azure Storage File Share SDK for Python. Use for... | Implementation |
| [storage-file-share-ts](../../skills/cncf/storage-file-share-ts/SKILL.md) | Cncf | "Provides Azure File Share JavaScript/TypeScript SDK... | Implementation |
| [storage-queue-py](../../skills/cncf/storage-queue-py/SKILL.md) | Cncf | "Provides Azure Queue Storage SDK for Python. Use for... | Implementation |
| [storage-queue-ts](../../skills/cncf/storage-queue-ts/SKILL.md) | Cncf | "Provides Azure Queue Storage JavaScript/TypeScript SDK... | Implementation |
| [store-changelog](../../skills/programming/store-changelog/SKILL.md) | Programming | "Provides Generate user-facing App Store release notes from... | Implementation |
| [store-design](../../skills/coding/store-design/SKILL.md) | Coding | "Provides Design and implement event stores for... | Implementation |
| [store-optimization](../../skills/programming/store-optimization/SKILL.md) | Programming | "Provides Complete App Store Optimization (ASO) toolkit for... | Implementation |
| [store-ts](../../skills/coding/store-ts/SKILL.md) | Coding | "Provides Create Zustand stores following established... | Implementation |
| [storytelling](../../skills/programming/storytelling/SKILL.md) | Programming | Provides Transform raw data into compelling narratives that... | Implementation |
| [strategic-design](../../skills/coding/strategic-design/SKILL.md) | Coding | "Provides Design DDD strategic artifacts including... | Implementation |
| [strategies](../../skills/coding/strategies/SKILL.md) | Coding | "Provides Transform debugging from frustrating guesswork... | Implementation |
| [strategies](../../skills/programming/strategies/SKILL.md) | Programming | Provides Guide to selecting and optimizing embedding models... | Implementation |
| [strategy](../../skills/programming/strategy/SKILL.md) | Programming | "Provides Plan a content strategy, topic clusters,... | Implementation |
| [strategy](../../skills/programming/strategy/SKILL.md) | Programming | "Provides You are an expert in SaaS product launches and... | Implementation |
| [strategy](../../skills/programming/strategy/SKILL.md) | Programming | "Provides Design pricing, packaging, and monetization... | Implementation |
| [strategy-base](../../skills/coding/strategy-base/SKILL.md) | Coding | "Abstract base strategy pattern with initialization guards,... | Implementation |
| [strimzi](../../skills/cncf/strimzi/SKILL.md) | Cncf | "Provides Strimzi in Kafka on Kubernetes - Apache Kafka for... | Reference |
| [structure-architect](../../skills/programming/structure-architect/SKILL.md) | Programming | "Analyzes and optimizes content structure including header... | Implementation |
| [structure-protocol](../../skills/programming/structure-protocol/SKILL.md) | Programming | "Provides Give agents persistent structural memory of a... | Implementation |
| [structured-output](../../skills/programming/structured-output/SKILL.md) | Programming | "Get reliable JSON, enums, and typed objects from LLMs... | Implementation |
| [studio](../../skills/programming/studio/SKILL.md) | Programming | "Provides Studio de geracao de imagens inteligente —... | Implementation |
| [studio-image](../../skills/programming/studio-image/SKILL.md) | Programming | Provides Geracao de imagens humanizadas via Google AI... | Implementation |
| [suite-testing](../../skills/coding/suite-testing/SKILL.md) | Coding | Provides Execute comprehensive web application security... | Review |
| [summarizer](../../skills/programming/summarizer/SKILL.md) | Programming | "Provides Extract transcripts from YouTube videos and... | Implementation |
| [supabase-auth](../../skills/programming/supabase-auth/SKILL.md) | Programming | "Provides expert integration of supabase auth with next.js... | Implementation |
| [superpowers](../../skills/agent/superpowers/SKILL.md) | Agent | "Provides use when starting any conversation - establishes... | Implementation |
| [support](../../skills/programming/support/SKILL.md) | Programming | "Provides Elite AI-powered customer support specialist... | Implementation |
| [sutskever](../../skills/programming/sutskever/SKILL.md) | Programming | "Provides Agente que simula Ilya Sutskever — co-fundador da... | Implementation |
| [sveltekit](../../skills/coding/sveltekit/SKILL.md) | Coding | "Provides Build full-stack web applications with SvelteKit... | Implementation |
| [sympy](../../skills/programming/sympy/SKILL.md) | Programming | "Provides SymPy is a Python library for symbolic... | Implementation |
| [systems](../../skills/agent/systems/SKILL.md) | Agent | "Provides Design short-term, long-term, and graph-based... | Implementation |
| [systems](../../skills/programming/systems/SKILL.md) | Programming | "Provides Email has the highest ROI of any marketing... | Implementation |
| [tactical-patterns](../../skills/coding/tactical-patterns/SKILL.md) | Coding | "Provides Apply DDD tactical patterns in code using... | Implementation |
| [tailwind-setup](../../skills/programming/tailwind-setup/SKILL.md) | Programming | "Provides Set up Tailwind CSS v4 in Expo with... | Implementation |
| [tao](../../skills/programming/tao/SKILL.md) | Programming | "Provides Matemático ultra-avançado inspirado em Terence... | Implementation |
| [task-decomposition-engine](../../skills/agent/task-decomposition-engine/SKILL.md) | Agent | "Decomposes complex tasks into smaller, manageable subtasks... | Orchestration |
| [taskeither-ref](../../skills/programming/taskeither-ref/SKILL.md) | Programming | "Provides Quick reference for TaskEither. Use when user... | Implementation |
| [taste](../../skills/coding/taste/SKILL.md) | Coding | "Provides use when generating elite gsap-heavy frontend... | Implementation |
| [taste-frontend](../../skills/coding/taste-frontend/SKILL.md) | Coding | "Provides use when building high-agency frontend interfaces... | Implementation |
| [team-tactics](../../skills/coding/team-tactics/SKILL.md) | Coding | "Provides Red team tactics principles based on MITRE... | Review |
| [team-tools](../../skills/coding/team-tools/SKILL.md) | Coding | "Provides Implement proven methodologies and tool workflows... | Review |
| [teams-automation](../../skills/cncf/teams-automation/SKILL.md) | Cncf | 'Provides Automate Microsoft Teams tasks via Rube MCP... | Implementation |
| [tech](../../skills/programming/tech/SKILL.md) | Programming | Provides Integrate multiple digital health data sources,... | Implementation |
| [technical](../../skills/programming/technical/SKILL.md) | Programming | "Provides Audit technical SEO across crawlability,... | Implementation |
| [technical-cycle-analysis](../../skills/trading/technical-cycle-analysis/SKILL.md) | Trading | "Implements market cycles and periodic patterns in price... | Implementation |
| [technical-false-signal-filtering](../../skills/trading/technical-false-signal-filtering/SKILL.md) | Trading | "Provides False Signal Filtering Techniques for Robust... | Implementation |
| [technical-indicator-confluence](../../skills/trading/technical-indicator-confluence/SKILL.md) | Trading | "Provides Indicator Confluence Validation Systems for... | Implementation |
| [technical-intermarket-analysis](../../skills/trading/technical-intermarket-analysis/SKILL.md) | Trading | "Implements cross-market relationships and asset class... | Implementation |
| [technical-market-microstructure](../../skills/trading/technical-market-microstructure/SKILL.md) | Trading | "Implements order book dynamics and order flow analysis for... | Implementation |
| [technical-momentum-indicators](../../skills/trading/technical-momentum-indicators/SKILL.md) | Trading | "Implements rsi, macd, stochastic oscillators and momentum... | Implementation |
| [technical-price-action-patterns](../../skills/trading/technical-price-action-patterns/SKILL.md) | Trading | "Provides Analysis of candlestick and chart patterns for... | Implementation |
| [technical-regime-detection](../../skills/trading/technical-regime-detection/SKILL.md) | Trading | "Provides Market Regime Detection Systems for Adaptive... | Implementation |
| [technical-statistical-arbitrage](../../skills/trading/technical-statistical-arbitrage/SKILL.md) | Trading | "Implements pair trading and cointegration-based arbitrage... | Implementation |
| [technical-support-resistance](../../skills/trading/technical-support-resistance/SKILL.md) | Trading | "Implements technical levels where price tends to pause or... | Implementation |
| [technical-trend-analysis](../../skills/trading/technical-trend-analysis/SKILL.md) | Trading | "Provides Trend identification, classification, and... | Implementation |
| [technical-volatility-analysis](../../skills/trading/technical-volatility-analysis/SKILL.md) | Trading | "Implements volatility measurement, forecasting, and risk... | Implementation |
| [technical-volume-profile](../../skills/trading/technical-volume-profile/SKILL.md) | Trading | "Provides Volume analysis techniques for understanding... | Implementation |
| [technologies](../../skills/programming/technologies/SKILL.md) | Programming | "Provides Check for .claude/apple-design-context.md before... | Implementation |
| [tekton](../../skills/cncf/tekton/SKILL.md) | Cncf | "Provides Tekton in Cloud-Native Engineering - A... | Reference |
| [telegram](../../skills/coding/telegram/SKILL.md) | Coding | "Provides Integracao completa com Telegram Bot API. Setup... | Implementation |
| [template-business](../../skills/programming/template-business/SKILL.md) | Programming | "Provides Expert in building and selling Notion templates... | Implementation |
| [templates](../../skills/coding/templates/SKILL.md) | Coding | "Provides Create production-ready FastAPI projects with... | Implementation |
| [templates](../../skills/coding/templates/SKILL.md) | Coding | "Provides Project scaffolding templates for new... | Implementation |
| [templates](../../skills/programming/templates/SKILL.md) | Programming | "Provides Documentation templates and structure guidelines.... | Implementation |
| [test-driven-development](../../skills/coding/test-driven-development/SKILL.md) | Coding | "Test-Driven Development (TDD) and Behavior-Driven... | Implementation |
| [test-oracle-generator](../../skills/agent/test-oracle-generator/SKILL.md) | Agent | "Generates test oracles and expected outputs for testing... | Testing |
| [test-setup](../../skills/programming/test-setup/SKILL.md) | Programming | "Provides Structured guide for setting up A/B tests with... | Implementation |
| [testing](../../skills/agent/testing/SKILL.md) | Agent | Provides End-to-end testing workflow with Playwright for... | Implementation |
| [testing](../../skills/coding/testing/SKILL.md) | Coding | Provides Provide systematic methodologies for identifying... | Review |
| [testing](../../skills/coding/testing/SKILL.md) | Coding | Provides To test local web applications, write native... | Review |
| [testing](../../skills/programming/testing/SKILL.md) | Programming | Provides Master comprehensive testing strategies for smart... | Implementation |
| [testing-observability-api-mock](../../skills/coding/testing-observability-api-mock/SKILL.md) | Coding | Provides You are an API mocking expert specializing in... | Implementation |
| [testing-patterns](../../skills/coding/testing-patterns/SKILL.md) | Coding | "Provides Master Bash Automated Testing System (Bats) for... | Review |
| [testing-patterns](../../skills/coding/testing-patterns/SKILL.md) | Coding | Provides Build reliable, fast, and maintainable end-to-end... | Review |
| [testing-patterns](../../skills/programming/testing-patterns/SKILL.md) | Programming | Provides Comprehensive guide for implementing robust... | Implementation |
| [testing-patterns](../../skills/programming/testing-patterns/SKILL.md) | Programming | Provides Implement comprehensive testing strategies with... | Implementation |
| [testing-review-ai-review](../../skills/programming/testing-review-ai-review/SKILL.md) | Programming | Provides You are an expert AI-powered code review... | Implementation |
| [testing-review-multi-agent-review](../../skills/programming/testing-review-multi-agent-review/SKILL.md) | Programming | Provides use when working with performance testing review... | Implementation |
| [testing-test-generate](../../skills/coding/testing-test-generate/SKILL.md) | Coding | "Provides Generate comprehensive, maintainable unit tests... | Review |
| [textures](../../skills/programming/textures/SKILL.md) | Programming | "Provides Three.js textures - texture types, UV mapping,... | Implementation |
| [thanos](../../skills/cncf/thanos/SKILL.md) | Cncf | "Provides Thanos in High availability Prometheus solution... | Reference |
| [the-update-framework-tuf](../../skills/cncf/the-update-framework-tuf/SKILL.md) | Cncf | "The Update Framework (TUF) in Secure software update... | Reference |
| [theme-development](../../skills/agent/theme-development/SKILL.md) | Agent | "Provides WordPress theme development workflow covering... | Implementation |
| [tikv](../../skills/cncf/tikv/SKILL.md) | Cncf | "TiKV in Distributed transactional key-value database... | Reference |
| [time-analysis](../../skills/coding/time-analysis/SKILL.md) | Coding | "Provides Analyze cryptographic code to detect operations... | Review |
| [tmux](../../skills/programming/tmux/SKILL.md) | Programming | "Provides Expert tmux session, window, and pane management... | Implementation |
| [to-be-done-analyst](../../skills/programming/to-be-done-analyst/SKILL.md) | Programming | "Provides one sentence - what this skill does and when to... | Implementation |
| [to-code-compliance](../../skills/coding/to-code-compliance/SKILL.md) | Coding | "Provides Verifies code implements exactly what... | Review |
| [to-wordpress-converter](../../skills/programming/to-wordpress-converter/SKILL.md) | Programming | "Provides Expert skill for converting any codebase... | Implementation |
| [tokens](../../skills/programming/tokens/SKILL.md) | Programming | "Provides List, add, and update StyleSeed design tokens... | Implementation |
| [tool-builder](../../skills/programming/tool-builder/SKILL.md) | Programming | Provides Tools are how AI agents interact with the world. A... | Implementation |
| [tool-builder](../../skills/programming/tool-builder/SKILL.md) | Programming | "Provides Expert in building custom tools that solve your... | Implementation |
| [tool-strategy](../../skills/programming/tool-strategy/SKILL.md) | Programming | "Provides You are an expert in engineering-as-marketing... | Implementation |
| [toolkit-smart-debug](../../skills/programming/toolkit-smart-debug/SKILL.md) | Programming | "Provides use when working with debugging toolkit smart... | Implementation |
| [tools](../../skills/coding/tools/SKILL.md) | Coding | "Provides Master essential security scanning tools for... | Review |
| [tracing](../../skills/cncf/tracing/SKILL.md) | Cncf | Provides Implement distributed tracing with Jaeger and... | Implementation |
| [tracking](../../skills/programming/tracking/SKILL.md) | Programming | Provides Design, audit, and improve analytics tracking... | Implementation |
| [trade-compliance](../../skills/programming/trade-compliance/SKILL.md) | Programming | "Provides Codified expertise for customs documentation,... | Implementation |
| [traffic-management](../../skills/cncf/traffic-management/SKILL.md) | Cncf | Provides Comprehensive guide to Istio traffic management... | Implementation |
| [transcriber](../../skills/agent/transcriber/SKILL.md) | Agent | "Provides Transform audio recordings into professional... | Implementation |
| [transformation-patterns](../../skills/programming/transformation-patterns/SKILL.md) | Programming | "Provides Production-ready patterns for dbt (data build... | Implementation |
| [tree-construction](../../skills/coding/tree-construction/SKILL.md) | Coding | "Provides Build comprehensive attack trees to visualize... | Review |
| [trend-analysis](../../skills/agent/trend-analysis/SKILL.md) | Agent | Provides Discover and track emerging trends across Google... | Implementation |
| [trend-analyzer](../../skills/programming/trend-analyzer/SKILL.md) | Programming | "Provides 分析一段时间内健康数 据的趋势和模式。关联药物、症 状、生命体征、化验结果和其他... | Implementation |
| [troubleshooter](../../skills/cncf/troubleshooter/SKILL.md) | Cncf | "Provides Expert DevOps troubleshooter specializing in... | Implementation |
| [troubleshooting](../../skills/agent/troubleshooting/SKILL.md) | Agent | "Provides Linux system troubleshooting workflow for... | Implementation |
| [trust-metadata](../../skills/programming/trust-metadata/SKILL.md) | Programming | "Provides the ai native file format. exif for ai — stamps... | Implementation |
| [ts-errors](../../skills/programming/ts-errors/SKILL.md) | Programming | "Provides Handle errors as values using fp-ts Either and... | Implementation |
| [ts-pragmatic](../../skills/programming/ts-pragmatic/SKILL.md) | Programming | "Provides a practical, jargon-free guide to fp-ts... | Implementation |
| [ts-react](../../skills/programming/ts-react/SKILL.md) | Programming | Provides Practical patterns for using fp-ts with React -... | Implementation |
| [twitter-scraper](../../skills/programming/twitter-scraper/SKILL.md) | Programming | "Provides X (Twitter) data platform skill — tweet search,... | Implementation |
| [types-ref](../../skills/programming/types-ref/SKILL.md) | Programming | "Provides Quick reference for fp-ts types. Use when user... | Implementation |
| [typescript](../../skills/programming/typescript/SKILL.md) | Programming | "Provides Guide for building reliable, fault-tolerant... | Implementation |
| [typescript-typescript-scaffold](../../skills/coding/typescript-typescript-scaffold/SKILL.md) | Coding | "Provides You are a TypeScript project architecture expert... | Implementation |
| [ui](../../skills/coding/ui/SKILL.md) | Coding | "Provides use when creating clean editorial interfaces with... | Implementation |
| [ui](../../skills/programming/ui/SKILL.md) | Programming | "Validates animation durations, enforces typography scale,... | Implementation |
| [ui-dark-ts](../../skills/programming/ui-dark-ts/SKILL.md) | Programming | Provides a modern dark-themed react ui system using... | Implementation |
| [ui-design](../../skills/programming/ui-design/SKILL.md) | Programming | "Provides Expert guidance for crafting effective prompts in... | Implementation |
| [ui-design-system](../../skills/programming/ui-design-system/SKILL.md) | Programming | "Provides Build accessible design systems with Radix UI... | Implementation |
| [ui-generator](../../skills/programming/ui-generator/SKILL.md) | Programming | "Provides Utilizes Magic by 21st.dev to generate, compare,... | Implementation |
| [ui-jetpack-compose](../../skills/programming/ui-jetpack-compose/SKILL.md) | Programming | "Provides expo-ui-jetpack-compose functionality and... | Implementation |
| [ui-patterns](../../skills/programming/ui-patterns/SKILL.md) | Programming | Provides Modern Angular UI patterns for loading states,... | Implementation |
| [ui-patterns](../../skills/programming/ui-patterns/SKILL.md) | Programming | Provides Modern React UI patterns for loading states, error... | Implementation |
| [ui-patterns](../../skills/programming/ui-patterns/SKILL.md) | Programming | "Provides Apply proven SwiftUI UI patterns for navigation,... | Implementation |
| [ui-swift-ui](../../skills/programming/ui-swift-ui/SKILL.md) | Programming | "Provides expo-ui-swift-ui functionality and capabilities." | Implementation |
| [ui-verification](../../skills/coding/ui-verification/SKILL.md) | Coding | Provides Automated end-to-end UI testing and verification... | Review |
| [ultimate-scraper](../../skills/agent/ultimate-scraper/SKILL.md) | Agent | Provides AI-driven data extraction from 55+ Actors across... | Implementation |
| [updater](../../skills/programming/updater/SKILL.md) | Programming | "Provides speckit safe update functionality and... | Implementation |
| [upgrade](../../skills/programming/upgrade/SKILL.md) | Programming | "Provides Master major dependency version upgrades,... | Implementation |
| [upgrade-advisor](../../skills/programming/upgrade-advisor/SKILL.md) | Programming | 'Provides Step-by-step Odoo version upgrade advisor:... | Implementation |
| [upgrade-cro](../../skills/programming/upgrade-cro/SKILL.md) | Programming | "Provides You are an expert in in-app paywalls and upgrade... | Implementation |
| [uploads](../../skills/coding/uploads/SKILL.md) | Coding | "Provides Expert at handling file uploads and cloud... | Review |
| [upscale](../../skills/programming/upscale/SKILL.md) | Programming | Provides upscale and enhance image and video resolution... | Implementation |
| [urgency-psychologist](../../skills/programming/urgency-psychologist/SKILL.md) | Programming | "Provides one sentence - what this skill does and when to... | Implementation |
| [use](../../skills/programming/use/SKILL.md) | Programming | "Provides Build and maintain Rayden UI components and... | Implementation |
| [use-agents](../../skills/programming/use-agents/SKILL.md) | Programming | Provides Build AI agents that interact with computers like... | Implementation |
| [use-guardian](../../skills/cncf/use-guardian/SKILL.md) | Cncf | "Provides FREE — Intelligent tool-call reliability wrapper.... | Implementation |
| [ux-designer](../../skills/programming/ux-designer/SKILL.md) | Programming | "Provides Create interface designs, wireframes, and design... | Implementation |
| [ux-pro-max](../../skills/coding/ux-pro-max/SKILL.md) | Coding | "Provides Comprehensive design guide for web and mobile... | Implementation |
| [v2-py](../../skills/programming/v2-py/SKILL.md) | Programming | Provides Build container-based Foundry Agents with Azure AI... | Implementation |
| [validation-config-validate](../../skills/cncf/validation-config-validate/SKILL.md) | Cncf | Provides You are a configuration management expert... | Implementation |
| [validation-expert](../../skills/agent/validation-expert/SKILL.md) | Agent | Provides Expert guide for interpreting and fixing n8n... | Implementation |
| [validation-expert](../../skills/coding/validation-expert/SKILL.md) | Coding | "Provides Expert in Zod — TypeScript-first schema... | Implementation |
| [validator](../../skills/agent/validator/SKILL.md) | Agent | "Validates Conductor project artifacts for completeness"... | Orchestration |
| [vantage](../../skills/programming/vantage/SKILL.md) | Programming | 'Provides Access 20+ years of global financial data:... | Implementation |
| [varlock](../../skills/coding/varlock/SKILL.md) | Coding | "Provides Secure-by-default environment variable management... | Review |
| [vexor](../../skills/programming/vexor/SKILL.md) | Programming | "Provides Vector-powered CLI for semantic file search with... | Implementation |
| [viboscope](../../skills/agent/viboscope/SKILL.md) | Agent | "Provides Psychological compatibility matching — find... | Implementation |
| [videodb](../../skills/programming/videodb/SKILL.md) | Programming | "Provides Video and audio perception, indexing, and... | Implementation |
| [view-refactor](../../skills/programming/view-refactor/SKILL.md) | Programming | Provides Refactor SwiftUI views into smaller components... | Implementation |
| [viewmodels-zafiro](../../skills/programming/viewmodels-zafiro/SKILL.md) | Programming | "Provides Optimal ViewModel and Wizard creation patterns... | Implementation |
| [vision-expert](../../skills/programming/vision-expert/SKILL.md) | Programming | Provides SOTA Computer Vision Expert (2026). Specialized in... | Implementation |
| [visual-validator](../../skills/programming/visual-validator/SKILL.md) | Programming | "Provides Rigorous visual validation expert specializing in... | Implementation |
| [vitepress](../../skills/programming/vitepress/SKILL.md) | Programming | "Provides Transform generated wiki Markdown files into a... | Implementation |
| [vitess](../../skills/cncf/vitess/SKILL.md) | Cncf | "Provides Vitess in Database clustering system for... | Reference |
| [vizcom](../../skills/programming/vizcom/SKILL.md) | Programming | "Provides AI-powered product design tool for transforming... | Implementation |
| [volcano](../../skills/cncf/volcano/SKILL.md) | Cncf | "Configures volcano in batch scheduling infrastructure for... | Reference |
| [wasmcloud](../../skills/cncf/wasmcloud/SKILL.md) | Cncf | "Provides wasmCloud in WebAssembly-based distributed... | Reference |
| [web](../../skills/programming/web/SKILL.md) | Programming | Provides Web search, content extraction, crawling, and... | Implementation |
| [web-app](../../skills/coding/web-app/SKILL.md) | Coding | "Provides Build Progressive Web Apps (PWAs) with offline... | Implementation |
| [web-experience](../../skills/programming/web-experience/SKILL.md) | Programming | "Provides Expert in building 3D experiences for the web -... | Implementation |
| [web-fuzzing](../../skills/coding/web-fuzzing/SKILL.md) | Coding | "Provides Expert guidance for ffuf web fuzzing during... | Review |
| [web-pubsub-ts](../../skills/cncf/web-pubsub-ts/SKILL.md) | Cncf | "Provides Real-time messaging with WebSocket connections... | Implementation |
| [web-vulnerabilities](../../skills/coding/web-vulnerabilities/SKILL.md) | Coding | "Provides Provide a comprehensive, structured reference for... | Review |
| [websocket-manager](../../skills/coding/websocket-manager/SKILL.md) | Coding | "WebSocket connection manager with state machine... | Implementation |
| [widget](../../skills/coding/widget/SKILL.md) | Coding | "Provides Build a real-time support chat system with a... | Implementation |
| [widget-patterns](../../skills/programming/widget-patterns/SKILL.md) | Programming | "CRITICAL: Use for Robius widget patterns. Triggers on"... | Implementation |
| [widgets](../../skills/programming/widgets/SKILL.md) | Programming | 'Provides Version: makepad-widgets (dev branch) | Last... | Implementation |
| [win11-speckit-update-skill](../../skills/programming/win11-speckit-update-skill/SKILL.md) | Programming | Provides windows 11 system management functionality and... | Implementation |
| [window-management](../../skills/agent/window-management/SKILL.md) | Agent | "Provides Strategies for managing LLM context windows... | Implementation |
| [windows](../../skills/programming/windows/SKILL.md) | Programming | "Provides PowerShell Windows patterns. Critical pitfalls,... | Implementation |
| [with-files](../../skills/agent/with-files/SKILL.md) | Agent | 'Implements work like manus: use persistent markdown files... | Orchestration |
| [wizard](../../skills/programming/wizard/SKILL.md) | Programming | "Provides Done-for-you .faf generator. One-click AI context... | Implementation |
| [woocommerce-bridge](../../skills/programming/woocommerce-bridge/SKILL.md) | Programming | 'Provides Sync Odoo with WooCommerce: products, inventory,... | Implementation |
| [woocommerce-development](../../skills/agent/woocommerce-development/SKILL.md) | Agent | 'Provides WooCommerce store development workflow covering... | Implementation |
| [wordpress](../../skills/agent/wordpress/SKILL.md) | Agent | "Provides Complete WordPress development workflow covering... | Implementation |
| [work-summary](../../skills/programming/work-summary/SKILL.md) | Programming | "Provides Go back through the previous year of work and... | Implementation |
| [workers-expert](../../skills/coding/workers-expert/SKILL.md) | Coding | "Provides Expert in Cloudflare Workers and the Edge... | Implementation |
| [workflow](../../skills/cncf/workflow/SKILL.md) | Cncf | "Provides Complete guide to implementing GitOps workflows... | Implementation |
| [workflow](../../skills/coding/workflow/SKILL.md) | Coding | "Provides Test-Driven Development workflow principles.... | Review |
| [workflow](../../skills/programming/workflow/SKILL.md) | Programming | Provides generate workflow json files for chaining ai... | Implementation |
| [workflow-automation](../../skills/agent/workflow-automation/SKILL.md) | Agent | "Provides Patterns for automating GitHub workflows with AI... | Orchestration |
| [workflow-patterns](../../skills/agent/workflow-patterns/SKILL.md) | Agent | Implements proven architectural patterns for building n8n... | Implementation |
| [workflows](../../skills/agent/workflows/SKILL.md) | Agent | "Provides Orchestrate multiple Antigravity skills through... | Orchestration |
| [workflows-tdd-cycle](../../skills/coding/workflows-tdd-cycle/SKILL.md) | Coding | "Implements use when working with tdd workflows tdd cycle... | Review |
| [workflows-tdd-green](../../skills/coding/workflows-tdd-green/SKILL.md) | Coding | "Provides Implement the minimal code needed to make failing... | Review |
| [workflows-tdd-red](../../skills/coding/workflows-tdd-red/SKILL.md) | Coding | "Provides Generate failing tests for the TDD red phase to... | Review |
| [workflows-tdd-refactor](../../skills/coding/workflows-tdd-refactor/SKILL.md) | Coding | "Implements use when working with tdd workflows tdd... | Review |
| [workspace-patterns](../../skills/programming/workspace-patterns/SKILL.md) | Programming | "Provides Configure and optimize Nx monorepo workspaces.... | Implementation |
| [wrapper-product](../../skills/programming/wrapper-product/SKILL.md) | Programming | Provides Expert in building products that wrap AI APIs... | Implementation |
| [writer](../../skills/agent/writer/SKILL.md) | Agent | "Provides Create pull requests following Sentry's... | Orchestration |
| [writer](../../skills/agent/writer/SKILL.md) | Agent | "Provides Create and improve agent skills following the... | Implementation |
| [writer](../../skills/programming/writer/SKILL.md) | Programming | "Provides Document creation, format conversion... | Implementation |
| [writing](../../skills/agent/writing/SKILL.md) | Agent | "Provides Structured task planning with clear breakdowns,... | Orchestration |
| [writing](../../skills/cncf/writing/SKILL.md) | Cncf | Provides Comprehensive guide to writing effective,... | Implementation |
| [writing](../../skills/programming/writing/SKILL.md) | Programming | "Provides this is the core skill for the deep research and... | Implementation |
| [writing-guide](../../skills/programming/writing-guide/SKILL.md) | Programming | "Provides this skill enforces sentry's blog writing... | Implementation |
| [xml-views-builder](../../skills/programming/xml-views-builder/SKILL.md) | Programming | 'Provides Expert at building Odoo XML views: Form, List,... | Implementation |
| [zafiro-development](../../skills/programming/zafiro-development/SKILL.md) | Programming | "Provides Mandatory skills, conventions, and behavioral... | Implementation |
| [zot](../../skills/cncf/zot/SKILL.md) | Cncf | "Zot in Container Registry - cloud native architecture,... | Reference |


<!-- AUTO-GENERATED SKILLS INDEX END -->