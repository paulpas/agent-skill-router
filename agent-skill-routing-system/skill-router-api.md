## Auto-Routing Directive

**At the start of EVERY task**, call the `route_to_skill` MCP tool with the task description before doing any work. The tool returns the full content of the most relevant skill — follow its guidelines for your implementation.

Example:
- User asks to review code → call `route_to_skill("review this code for quality and security issues")`
- User asks to deploy to Kubernetes → call `route_to_skill("deploy application to Kubernetes cluster")`
- User asks about trading algorithms → call `route_to_skill("implement TWAP trading execution algorithm")`

If the tool returns a skill, follow it. If the router is unavailable, proceed without it.

## Communication Style

When generating responses:
- **Do not use litotes** (e.g., "not bad" → say "good")
- **Do not use irony or sarcasm**
- **Do not use double negatives** (e.g., "not uncommon" → say "common")
- **Do not use understatement** (e.g., "it's not a small problem" → say "it's a large problem")
- **Use direct, clear, literal language**
- **Use strong, positive assertions** instead of negated opposites
- **If something is good, say it's good. If it's bad, say it's bad.**

---

# Skill Router API

The Skill Router is running at `http://localhost:3000` and provides intelligent task→skill matching.

## Endpoints

### Health Check
```bash
curl http://localhost:3000/health
```
Response: `{"status":"healthy","timestamp":"...","version":"1.0.0"}`

### Stats
```bash
curl http://localhost:3000/stats
```
Response: `{"skills":{"totalSkills":N,"categories":N,"tags":N},"mcpTools":{...}}`

### Route a Task to Skills
```bash
curl -X POST http://localhost:3000/route \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Deploy a Kubernetes manifest to production",
    "context": {"environment": "production"},
    "constraints": {"maxSkills": 3}
  }'
```
Returns: selected skills, confidence scores, execution plan (sequential/parallel/hybrid).

### Execute a Task
```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Deploy a Kubernetes manifest to production",
    "inputs": {"manifest": "..."},
    "skills": ["cncf-kubernetes"]
  }'
```

## Usage in OpenCode Sessions

When you need to route a task to the best skill, call the `/route` endpoint via shell tools.
The router uses OpenAI embeddings + LLM ranking to find the most relevant skills.

### List All Loaded Skills
```bash
curl http://localhost:3000/skills
```
Returns: array of all skill objects with name, description, tags, and source path.

### Get Skill Content by Name
```bash
curl http://localhost:3000/skill/coding-security-review
```
Returns: full `SKILL.md` content as plain text. Use this to read a specific skill without routing.

### Routing History (Last 100)
```bash
curl http://localhost:3000/access-log
```
Returns: `{totalRequests, entries[{timestamp, task, topSkill, totalMatches, confidence, latencyMs}]}`

### Force Reload Skills from GitHub
```bash
curl -X POST http://localhost:3000/reload
```
Triggers an immediate `git fetch + reset` and re-indexes all skills. Use after pushing new skills.

## Skill Citation

When `route_to_skill` loads skills, end your response with one compact line with any number of combinations of:

`> 📖 skill(local cache): <name-1>, <name-2> | 📖 skill(remotely sourced): <name-1>, <name-2> | 📖 skill(LLM compressed): <name-1>, <name-2>`

List all **externally-sourced** skill names comma-separated. **Omit built-in/OpenCode-internal skills** (e.g., `customize-opencode`, `code-philosophy`, `explore`) — these are loaded by OpenCode itself, not via the skill-router API, and should never appear in citations. Omit the entire citation line if no external skills were loaded this turn.

## Docker Management

```bash
# Check container status
docker ps --filter name=skill-router

# View logs
docker logs skill-router --tail 50 -f

# Restart
docker restart skill-router

# Stop
docker stop skill-router
```

---

## Writing Effective Task Descriptions

The skill router matches your task description against skill triggers — the keywords skill authors define in their metadata. Writing task descriptions that align with how skills are triggered produces better routing results.

### The Two-Tier Strategy

Skills use a two-tier trigger strategy combining:

1. **Technical Terms** — Exact domain terminology, abbreviations, and product names (e.g., `PromQL`, `kubernetes`, `ATR`, `stop loss`)
2. **Conversational Variants** — Natural language phrases non-technical users would type (e.g., `how do i monitor systems`, `how do i limit losses`, `help with backups`)

**Your task description benefits from using both styles:**

| Effective | Less Effective |
|-----------|-----------------|
| `Implement a stop loss strategy for crypto trading` | `Do risk management` |
| `Set up Kubernetes monitoring with Prometheus` | `Configure monitoring` |
| `Write unit tests for the auth module` | `Add tests` |

### Guidelines for Better Routing

- **Be specific** — Use the exact tool/framework name: `PostgreSQL` not just `database`, `pytest` not just `testing`
- **Include the action** — Verbs help: `deploy`, `refactor`, `debug`, `implement`
- **Mention context** — Add market context (`crypto`, `forex`), deployment model (`self-hosted`, `serverless`), or operational concern (`production`, `high-traffic`)
- **Use natural phrasing** — Write like you'd ask a colleague: "how do i set up CI/CD" works better than "CI/CD pipeline configuration"
- **Avoid ultra-generic words** — Words like `code`, `data`, `risk`, `pattern` alone are too broad and may not trigger the right skill

### How Trigger Matching Works

The router scores your task against each skill's trigger set:
- Direct keyword matches increase the score
- Conversational variants (how do i..., help with...) catch broader phrasing
- Domain-specific terms (technical + business language) improve precision

A well-formed task description with 2-4 domain-specific terms typically produces confident routing results.
