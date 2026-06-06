# OpenCode Prompts for API Walkthrough Tasks

Reference collection of copy-paste prompts you can paste into an OpenCode session to have it perform API walkthrough, verification, audit, and end-to-end testing tasks against the Agent Skill Router.

---

## Scenario 1: Full API Walkthrough Generation

**When to use:** You want a complete, step-by-step API walkthrough document generated from scratch by reading the actual source code — similar to `docs/api-walkthrough.md` but potentially with different focus areas, updated content, or refreshed curl examples.

### Prompt

````
Read the source code in agent-skill-routing-system/src/ to understand every HTTP endpoint of the Agent Skill Router. Then generate a comprehensive API walkthrough document and save it to docs/api-walkthrough.md.

Requirements:
1. Read the actual TypeScript interfaces and route handlers in src/index.ts, src/core/types.ts, and src/core/Router.ts to discover all endpoints, their request/response shapes, and query parameters.
2. Build a complete walkthrough covering these sections:
   - Introduction & setup (how to start the router via npm, Docker, or CLI)
   - Health & status endpoints (GET /health, GET /stats)
   - Skills library exploration (GET /skills, GET /skill/:name)
   - Routing — the core feature (POST /route with all fields)
   - Executing skills (POST /execute)
   - Auto-skill creation (POST /skill/create, GET /skills/created)
   - Link following configuration (GET/POST /config/link-following)
   - Compression & metrics (GET /metrics, compression query param on /skill/:name)
   - Force reload (POST /reload)
   - Access log (GET /access-log)
3. For each endpoint include:
   - The HTTP method and path
   - A real curl example matching the actual request body shape from the TypeScript interfaces
   - A sample JSON response showing every field with its type
   - A brief explanation of what the endpoint does
4. Include mermaid diagrams for:
   - Architecture overview (agent → router → embedding service → vector DB → skills)
   - Routing pipeline flow (embed → vector search → BM25 → hybrid scoring → MMR diversification → LLM ranking → execution plan)
   - Compression tier hierarchy (brief→moderate→detailed mapping to levels 1, 5, 8)
5. Use real curl examples that match actual API shapes from the TypeScript interfaces — do not invent fields.
6. Reference the actual compression level mappings: brief=L1 (~5%), moderate=L5 (~35%), detailed=L8 (~68%).
7. Cover edge cases: 503 during loading, 401 with auth enabled, 429 rate limiting, 400 validation errors, and the access-log entry format.
8. End with a reference table summarizing every endpoint (method, path, status codes, purpose).
````

### What this prompt does

This instructs OpenCode to read the full codebase, understand every route handler in `src/index.ts`, extract all TypeScript interface shapes from `src/core/types.ts` and the compression mapping logic from `SkillCompressor.ts` and `SkillRegistry.ts`, then generate a comprehensive walkthrough document. The resulting file serves as both documentation and a self-updating reference that stays accurate as long as OpenCode reads the source rather than relying on cached knowledge.

---

## Scenario 2: Verify an Endpoint Works Correctly

**When to use:** You've just pushed new skills, changed a response shape, or fixed a bug — and you want OpenCode to test a specific endpoint against a running router instance, report actual response shapes, flag discrepancies, and check for issues like wrong field names (e.g. `totalSkills` vs `skillCount`).

### Prompt

````
Test the Agent Skill Router endpoints at http://localhost:3000 and verify they work correctly. Follow these steps in order:

1. **Check if the server is running:**
   Run `curl -s http://localhost:3000/health` and report the full response. Note the `ready`, `loading`, and `status` fields.

2. **Test GET /skills:**
   Run `curl -s http://localhost:3000/skills | jq .` (or curl without jq if not available). Report:
   - The top-level field names in the response
   - The value of `total` and how it compares to the skills array length
   - Sample skill entries showing name, category, description, tags, version, sourceFile
   - Whether any expected fields are missing compared to what the TypeScript interfaces define

3. **Test GET /stats:**
   Run `curl -s http://localhost:3000/stats | jq .` (or curl without jq). Report:
   - Top-level field names in the response
   - Values for totalSkills, categories, tags under skills
   - Any mcpTools data present

4. **Test POST /route:**
   Run:
   ```bash
   curl -s -X POST http://localhost:3000/route \
     -H "Content-Type: application/json" \
     -d '{
       "task": "Implement a stop loss strategy for crypto trading",
       "context": {"market": "crypto"},
       "constraints": {"maxSkills": 3}
     }' | jq .
   ```
   Report the full response shape. Verify these fields exist:
   - `taskId` (string)
   - `selectedSkills` (array of objects with name, score, role, reasoning)
   - `confidence` (number)
   - `executionPlan` (object with strategy and steps)
   - `reasoningSummary`, `candidatePool`, `latencyMs`

5. **Test GET /skill/:name with compression:**
   Pick the top skill from the /route response, then fetch it at three compression levels:
   ```bash
   curl -s "http://localhost:3000/skill/<SKILL_NAME>?compression=brief" | wc -c
   curl -s "http://localhost:3000/skill/<SKILL_NAME>?compression=moderate" | wc -c
   curl -s "http://localhost:3000/skill/<SKILL_NAME>?compression=detailed" | wc -c
   ```
   Report each byte count and verify that brief < moderate < detailed (smaller compression = larger output).

6. **Flag any issues found:**
   For each endpoint, compare actual response fields against these TypeScript interfaces:
   - RouteResponse: taskId, selectedSkills[], executionPlan, confidence, reasoningSummary, candidatePool[], routingScores, latencyMs, scoreExplanations?
   - SelectedSkill: name, score, role ("primary"|"supporting"|"fallback"), reasoning?, scoreBreakdown?
   - /skills response: total (number), skills[] with name, category, description, tags, version, sourceFile
   Report any mismatches as discrepancies with severity (error/warning/info).

Save your findings to docs/endpoint-verification-results.md.
````

### What this prompt does

This creates a systematic verification sweep across all major endpoints. It validates response shapes against the TypeScript interfaces defined in `src/core/types.ts`, checks compression produces correctly ordered output sizes, and generates a written report of any field name mismatches or missing data. The prompt is designed to catch regressions like changed field names (`totalSkills` → `skillCount`) that could break downstream consumers.

---

## Scenario 3: Audit Compression Behavior

**When to use:** Compression isn't working as expected — for example, "moderate" returns identical output to the original, or compression levels don't match their documented savings. This prompt has OpenCode trace through the actual code path and test real behavior.

### Prompt

````
Audit the skill router's compression system end-to-end. The concern is that `?compression=moderate` might be returning identical output to the uncompressed version. Trace through the code, understand the mapping, and test it.

Step 1 — Read the compression source code:
Read these files and report what you find:
- agent-skill-routing-system/src/core/SkillCompressor.ts — list all compression levels (0-10+) and their transformations. Report the exact regex patterns used at each level.
- agent-skill-routing-system/src/core/SkillRegistry.ts — find the `getSkillContentWithCompression` method and report how version hints ('brief', 'moderate', 'detailed') map to compression levels. Also trace the caching layers (memory → disk → original fallback).

Step 2 — Verify the level mapping:
The documented mapping should be: brief→L1, moderate→L5, detailed→L8.
Confirm this exact mapping exists in the code and report any discrepancies.

Step 3 — Test compression against a real skill:
Pick a large skill (one with many code blocks) from the loaded skills list:
```bash
# Get skills list
SKILLS=$(curl -s http://localhost:3000/skills | jq -r '.skills[].name')
# Pick a skill that's likely large (coding or trading domain)
TARGET_SKILL=$(echo "$SKILLS" | grep -E "(code-review|refactoring|testing)" | head -1)

if [ -z "$TARGET_SKILL" ]; then
  TARGET_SKILL=$(echo "$SKILLS" | sed -n '2p')
fi

echo "Testing skill: $TARGET_SKILL"

# Fetch at each compression level and report sizes
echo "--- Uncompressed ---"
curl -s "http://localhost:3000/skill/$TARGET_SKILL?compression=brief" > /tmp/orig.md
wc -c /tmp/orig.md

echo "--- Compression: brief (L1) ---"
curl -s "http://localhost:3000/skill/$TARGET_SKILL?compression=brief" > /tmp/brief.md
wc -c /tmp/brief.md

echo "--- Compression: moderate (L5) ---"
curl -s "http://localhost:3000/skill/$TARGET_SKILL?compression=moderate" > /tmp/moderate.md
wc -c /tmp/moderate.md

echo "--- Compression: detailed (L8) ---"
curl -s "http://localhost:3000/skill/$TARGET_SKILL?compression=detailed" > /tmp/detailed.md
wc -c /tmp/detailed.md

# Check for identical output between uncompressed and moderate
echo "--- Diff: orig vs brief ---"
diff /tmp/orig.md /tmp/brief.md | head -20

echo "--- Diff: orig vs moderate ---"
diff /tmp/orig.md /tmp/moderate.md | head -20
```

Step 4 — Check response headers:
For the same skill, check that compression-related headers are present:
```bash
curl -sI "http://localhost:3000/skill/$TARGET_SKILL?compression=moderate"
```
Report all `X-Compression-*` headers.

Step 5 — Verify caching behavior:
Check the compression metrics endpoint to see if cache hits/misses are being tracked:
```bash
curl -s http://localhost:3000/metrics | jq .
```
Report any compression events (cache_hit, cache_miss, compression).

Step 6 — Report findings:
- Does moderate compression produce smaller output than the original? If not, why?
- Are all three compression levels producing different outputs in the right order?
- Are response headers present and correct?
- Is the compression cache working (check for cache_hit events)?
- Are there specific code line references explaining where things might be going wrong?

Save findings to docs/compression-audit.md.
````

### What this prompt does

This performs a deep audit by reading the actual transformation recipes in `SkillCompressor.ts` (Level 1 removes blank lines, Level 5 removes related-skills table, Level 8 abbreviates section names) and mapping them against the version-to-level lookup in `getSkillContentWithCompression` (`{ brief: 1, moderate: 5, detailed: 8 }`). It then tests real output sizes, checks for identical responses (the bug scenario), verifies HTTP headers (`X-Compression-Version`, `X-Compression-Percent`, `X-Compression-Source`), and examines the metrics endpoint for cache events. Findings are saved with specific code line references.

---

## Scenario 4: End-to-End Feature Walkthrough Test

**When to use:** You want to validate that the full pipeline works end-to-end — from health check readiness through routing, content fetching at different compression levels, and skill execution. This is a comprehensive smoke test that documents any failures or unexpected behaviors.

### Prompt

````
Run an end-to-end validation of the Agent Skill Router pipeline. Test every major feature in sequence, documenting pass/fail status for each step.

--- Phase 1: Server Readiness ---
Run `curl -s http://localhost:3000/health | jq .`
- Verify response has fields: status ("healthy"), ready (boolean), timestamp, version ("1.0.0")
- If ready=false, wait up to 30 seconds and retry (check every 5 seconds)
- Report final ready status

--- Phase 2: Skills Discovery ---
Run `curl -s http://localhost:3000/skills | jq .`
- Verify top-level fields: total (number), skills (array)
- Count skills and report the number
- List 5 sample skills showing their names and categories
- Check that skills have the expected metadata shape: name, category, description, tags[], version?, sourceFile?

--- Phase 3: Routing ---
Run a route request for a concrete task:
```bash
curl -s -X POST http://localhost:3000/route \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Implement a stop loss strategy for crypto trading",
    "constraints": {"maxSkills": 5}
  }' | jq .
```
- Verify response shape: taskId (string), selectedSkills[] (array), confidence (number), executionPlan, reasoningSummary, candidatePool[], routingScores, latencyMs
- Check that selectedSkills has at least one entry with role "primary" or "supporting"
- Extract the top skill name for use in later phases
- Run the same request with `includeScoreBreakdown: true` in constraints and verify scoreExplanations appear

--- Phase 4: Content Fetching ---
Using the top skill from routing, fetch at all compression levels:
```bash
SKILL=<TOP_SKILL_FROM_ROUTING>

echo "=== Uncompressed ==="
curl -s "http://localhost:3000/skill/$SKILL" > /tmp/e2e_orig.md
ORIG_SIZE=$(wc -c < /tmp/e2e_orig.md)
echo "$ORIG_SIZE bytes"

echo "=== Brief ==="
curl -s "http://localhost:3000/skill/$SKILL?compression=brief" > /tmp/e2e_brief.md
BRIEF_SIZE=$(wc -c < /tmp/e2e_brief.md)
echo "$BRIEF_SIZE bytes"

echo "=== Moderate ==="
curl -s "http://localhost:3000/skill/$SKILL?compression=moderate" > /tmp/e2e_mod.md
MOD_SIZE=$(wc -c < /tmp/e2e_mod.md)
echo "$MOD_SIZE bytes"

echo "=== Detailed ==="
curl -s "http://localhost:3000/skill/$SKILL?compression=detailed" > /tmp/e2e_detailed.md
DETAIL_SIZE=$(wc -c < /tmp/e2e_detailed.md)
echo "$DETAIL_SIZE bytes"

# Verify ordering
echo "--- Size ordering check ---"
[ "$BRIEF_SIZE" -le "$ORIG_SIZE" ] && echo "PASS: brief <= original" || echo "FAIL: brief > original"
[ "$MOD_SIZE" -le "$ORIG_SIZE" ] && echo "PASS: moderate <= original" || echo "FAIL: moderate > original"  
[ "$DETAIL_SIZE" -le "$ORIG_SIZE" ] && echo "PASS: detailed <= original" || echo "FAIL: detailed > original"
```
- Verify all compression sizes are less than or equal to original
- Check that response headers contain `X-Compression-Version`, `X-Compression-Percent`, `X-Compression-Tokens`

--- Phase 5: Execution ---
Run an execution request with the skill from routing:
```bash
TOP_SKILL=$(curl -s -X POST http://localhost:3000/route \
  -H "Content-Type: application/json" \
  -d '{"task": "review code for security issues"}' | jq -r '.selectedSkills[0].name')

curl -s -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d "{
    \"task\": \"Review a TypeScript file\",
    \"skills\": [\"$TOP_SKILL\"]
  }" | jq .
```
- Verify response shape: taskId, task, status ("success"/"partial_failure"/"failure"), results[]
- Each result should have: skillName, status, latencyMs, and either output or error

--- Phase 6: Admin & Monitoring ---
Test admin endpoints:
```bash
echo "=== Metrics ==="
curl -s http://localhost:3000/metrics | jq '.compression.stats, .recentEvents[0:3]'

echo "=== Access Log ==="
curl -s http://localhost:3000/access-log | jq '{totalRequests, firstEntry, lastEntry}'

echo "=== Stats ==="
curl -s http://localhost:3000/stats | jq .
```

--- Phase 7: Summary Report ---
Save a summary to docs/e2e-test-results.md with this format:
```markdown
# End-to-End Test Results

## Phase 1: Server Readiness — PASS/FAIL
- Status field: ...
- Ready field: ... (after X retries if needed)

## Phase 2: Skills Discovery — PASS/FAIL  
- Total skills: N
- Skills array non-empty: yes/no

## Phase 3: Routing — PASS/FAIL
- Top skill: <name>
- SelectedSkills count: N
- Confidence score: X.XX

## Phase 4: Content Fetching — PASS/FAIL
- Original: N bytes | Brief: N bytes | Moderate: N bytes | Detailed: N bytes
- Ordering correct: yes/no (brief <= moderate <= detailed <= original)
- Headers present: yes/no

## Phase 5: Execution — PASS/FAIL
- Status: success/partial_failure/failure
- Results count: N

## Phase 6: Admin & Monitoring — PASS/FAIL
- Metrics endpoint working: yes/no
- Access log populated: yes/no

## Issues Found
1. ...
````

### What this prompt does

This orchestrates a full pipeline test across all six phases: readiness verification, skill discovery, routing with score explanations, compressed content fetching with size ordering checks, execution via the execute endpoint, and admin/monitoring endpoint validation. Each phase reports pass/fail status. The final report in `docs/e2e-test-results.md` provides a quick health-check summary that can be committed or compared against previous runs to detect regressions.

---

## Quick Reference: Endpoint Shapes

All examples below use `http://localhost:3000` as the base URL.

| Method | Path | Body/Query | Purpose |
|--------|------|------------|---------|
| GET | `/health` | — | Check server status and readiness |
| GET | `/stats` | — | Skill count and MCP tool stats |
| GET | `/skills` | — | List all loaded skills with metadata |
| GET | `/skill/:name` | `?compression=brief\|moderate\|detailed`, `?domain=<cat>` | Fetch skill content, optionally compressed |
| POST | `/route` | `{task, context?, constraints?}` | Route a task to matching skills |
| POST | `/execute` | `{task, taskId?, inputs?, skills[]}` | Execute MCP tools for selected skills |
| POST | `/skill/create` | `{task, domain?, topic?, dryRun?}` | Auto-generate a new skill |
| GET | `/skills/created` | — | List all auto-created skills |
| POST | `/reload` | — | Force reload skills from GitHub |
| GET | `/metrics` | — | Compression metrics and cache events |
| GET | `/access-log` | — | Last 100 routing requests |
| GET | `/config/link-following` | — | Read link following config |
| POST | `/config/link-following` | `{max_depth?, link_following_enabled?, ...}` | Update link following config |

---

*Generated for the Agent Skill Router project. All curl examples and TypeScript interface shapes are based on the actual source code in `agent-skill-routing-system/src/`.*
