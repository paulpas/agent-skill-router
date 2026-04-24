---
name: agent-add-new-skill
description: 'Step-by-step guide for adding a new skill to the paulpas/skills repository:
  frontmatter spec, content structure, index update, and push workflow.'
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  role: orchestration
  scope: orchestration
  output-format: analysis
  triggers: add skill, contribute skill, create skill, new skill, skill authoring,
    skill template
---


# Add New Skill

Create and publish a properly formatted skill to the `paulpas/skills` repository. Skills are SKILL.md files with YAML frontmatter that get auto-indexed and served on demand by the skill router.

## TL;DR Checklist

- [ ] Choose a name: `<domain>-<topic>` (e.g. `coding-graphql-patterns`)
- [ ] Create directory: `skills/<name>/SKILL.md`
- [ ] Write valid YAML frontmatter (required: `name`, `description`)
- [ ] Write skill content (minimum: Purpose, When to Use, Core Workflow)
- [ ] Run `python3 reformat_skills.py` to fill missing frontmatter fields
- [ ] Run `python3 generate_index.py` to update `skills-index.json`
- [ ] `git add -A && git commit -m "feat: add <name> skill" && git push`

---

## When to Use

Use this skill when:

- Creating a brand-new skill for the `paulpas/skills` repository
- Authoring a skill template from scratch following the canonical spec
- Contributing an existing knowledge pattern as a reusable skill
- Migrating external skill content into this repository's format
- Auditing whether an existing skill follows the correct file structure

---

## When NOT to Use

Avoid this skill for:

- Editing or improving an existing skill's *content* — just edit the SKILL.md directly
- Routing or loading skills at runtime — use `agent-skill-routing-system` instead
- Evaluating skill quality after creation — use `agent-skill-evaluator` instead

---

## Domain Prefixes

| Prefix | Domain | Examples |
|---|---|---|
| `agent-` | Agent orchestration, routing, analysis | `agent-task-decomposition-engine` |
| `cncf-` | CNCF cloud-native projects | `cncf-kubernetes`, `cncf-helm` |
| `coding-` | Software engineering patterns | `coding-security-review` |
| `trading-` | Trading platform implementation | `trading-risk-stop-loss` |
| `programming-` | CS fundamentals, algorithms | `programming-algorithms` |

---

## Core Workflow

### Step 1 — Create the Directory and File

```bash
cd /path/to/skills-repo
mkdir -p skills/<domain>-<topic>
touch skills/<domain>-<topic>/SKILL.md
```

**Checkpoint:** Directory name must be kebab-case and match the `name` field in frontmatter exactly.

---

### Step 2 — Write the Frontmatter

Minimum required fields:

```yaml
---
name: coding-graphql-patterns
description: "GraphQL schema design, resolver patterns, and query optimization for production APIs."
  related-skills: agent-autoscaling-advisor, agent-ci-cd-pipeline-analyzer, agent-confidence-based-selector, agent-container-inspector
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  role: implementation
  scope: implementation
  output-format: code
  triggers: graphql, schema design, resolvers, query optimization, graphql api
---
```

#### Frontmatter Field Reference

| Field | Required | Notes |
|---|---|---|
| `name` | ✅ | Must match directory name exactly |
| `description` | ✅ | Single line, quoted if it contains colons |
| `license` | Recommended | Use `MIT` |
| `compatibility` | Recommended | Use `opencode` |
| `metadata.version` | Recommended | Semantic version string, e.g. `"1.0.0"` |
| `metadata.domain` | Recommended | One of: `agent`, `cncf`, `coding`, `trading`, `programming` |
| `metadata.role` | Recommended | `orchestration`, `reference`, `implementation`, or `review` |
| `metadata.scope` | Recommended | `orchestration`, `infrastructure`, `implementation`, or `review` |
| `metadata.output-format` | Recommended | `analysis`, `manifests`, `code`, or `report` |
| `metadata.triggers` | ✅ Critical | Comma-separated keywords; used for auto-routing — be specific |

> **Triggers are the most important field.** They determine when this skill is auto-loaded. Use 4–8 specific keywords that match the tasks this skill handles. Avoid generic words like "help" or "code".

---

### Step 3 — Write the Skill Content

Minimum required sections:

```markdown
# Skill Title

One-sentence purpose statement.

## When to Use

- Bullet list of situations where this skill applies

## When NOT to Use

- Bullet list of situations to avoid this skill

## Core Workflow

1. Step one
2. Step two
3. Step three

## Key Patterns

\```language
# concrete code example
\```

## Common Mistakes

| Mistake | Fix |
|---|---|
| Vague trigger keywords | Use specific, domain-accurate phrases |
| Missing frontmatter | Run `reformat_skills.py` to fill gaps |
```

**Checkpoint:** Verify the H1 title is human-readable (not the kebab-case directory name). Agent skills must include an ASCII flow diagram and a fallback/error routing description.

---

### Step 4 — Enrich Frontmatter Automatically

```bash
python3 reformat_skills.py
```

This script is **idempotent** — it only adds missing fields, never overwrites existing values. Run it after creating any new skill to ensure all required fields are present.

**Checkpoint:** The script prints a summary of fields it added. If `already_complete: 1`, the frontmatter is fully populated.

---

### Step 5 — Update the Skills Index

```bash
python3 generate_index.py
```

This regenerates `skills-index.json` from all `skills/*/SKILL.md` frontmatter. The skill router fetches this index at startup — **a skill that isn't in the index will never be routed to**.

Verify the entry was added:

```bash
python3 -c "import json; idx=json.load(open('skills-index.json')); print(next(s for s in idx if s['name']=='<your-skill-name>'))"
```

**Checkpoint:** The printed entry must include `name`, `description`, `domain`, `tags`, and `path` fields.

---

### Step 6 — Commit and Push

```bash
git add skills/<name>/SKILL.md skills-index.json
git commit -m "feat: add <name> skill"
git push
```

The skill router will pick up the new skill on the next startup (or immediately via hot-reload below).

---

## Instant Reload (No Restart)

```bash
curl -s -X POST http://localhost:3000/reload | python3 -m json.tool
```

This triggers a fresh pull from GitHub and rebuilds the in-memory index without restarting the container.

---

## Orchestration Flow

```
User requests a new skill
        ↓
Choose domain prefix + topic name
        ↓
Create skills/<name>/SKILL.md with frontmatter + content
        ↓
python3 reformat_skills.py ──→ Already complete? Skip, continue
        ↓
python3 generate_index.py
        ↓
Verify entry in skills-index.json ──→ Missing? Re-check name field match
        ↓
git add -A && git commit && git push
        ↓
curl -X POST http://localhost:3000/reload  (optional hot-reload)
```

---

## Common Mistakes

| Mistake | Problem | Fix |
|---|---|---|
| Directory name uses underscores | Fails routing match | Use strict kebab-case: `coding-graphql-patterns` |
| `name` in frontmatter ≠ directory name | Skill never routes correctly | They must match exactly |
| Missing `triggers` field | Skill never auto-loads | Add 4–8 specific, natural-language keywords |
| Generic triggers (`code`, `data`, `help`) | False positives on unrelated tasks | Use domain-specific phrases |
| Skipping `generate_index.py` | Skill invisible to router | Always regenerate the index after adding a skill |
| H1 title = kebab-case name | Poor readability | Use human-readable title: `# GraphQL Patterns` not `# coding-graphql-patterns` |
| No "When NOT to Use" section | Model applies skill too broadly | Explicitly list exclusion cases |

---

## Constraints

### MUST DO
- Match `name` field to directory name exactly (kebab-case)
- Include 4–8 specific `triggers` keywords
- Run `reformat_skills.py` before committing
- Run `generate_index.py` and commit `skills-index.json` alongside the new skill
- Use a human-readable H1 title (not the kebab-case directory name)

### MUST NOT DO
- Use generic trigger words (`code`, `data`, `fix`, `help`, `agent`)
- Use underscores or camelCase in directory or `name` field
- Commit a new skill without regenerating `skills-index.json`
- Leave placeholder text (`TODO`, `FIXME`, `example.com` links) in the skill

---

## Related Skills

| Skill | Purpose |
|---|---|
| `SKILL_FORMAT_SPEC.md` | Full frontmatter spec with all allowed values and annotated examples |
| `agent-skill-routing-system` | The router that serves skills on demand to OpenCode sessions |
| `agent-skill-evaluator` | Evaluates skill quality after creation |
| `agent-skill-auto-improver` | Automatically improves existing skill content |
| `agent-skill-version-manager` | Manages skill versioning and changelogs |
