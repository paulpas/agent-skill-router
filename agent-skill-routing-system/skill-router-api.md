## Auto-Routing Directive

**At the start of EVERY task**, call the `route_to_skill` MCP tool with the task description before doing any work. The tool returns the full content of the most relevant skill — follow its guidelines for your implementation.

Example:
- User asks to review code → call `route_to_skill("review this code for quality and security issues")`
- User asks to deploy to Kubernetes → call `route_to_skill("deploy application to Kubernetes cluster")`
- User asks about trading algorithms → call `route_to_skill("implement TWAP trading execution algorithm")`

If the tool returns a skill, follow it. If the router is unavailable, proceed without it.

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
Response: `{"skills":{"totalSkills":N,"categories":[...],"tags":[...]},"mcpTools":{...}}`

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

When `route_to_skill` loads skills, end your response with one compact line:

`> 📖 skill: <name-1>, <name-2>`

List all loaded skill names comma-separated. Omit entirely if no skill was loaded this turn.

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
