---
name: personal-knowledge-management
description: Implements a complete personal knowledge management system for developers
  including capture workflows, PARA organization framework, Zettelkasten linking patterns,
  and searchable reference libraries to retain and retrieve technical knowledge efficiently.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: personal knowledge management, PKM, Zettelkasten, PARA framework, note
    taking, how do i organize my notes, knowledge base, second brain
  archetypes:
  - tactical
  - generation
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - config
  - examples
  - do-dont
  related-skills: test-driven-development, refactoring, code-review
------
# Developer Knowledge Management System

Implements a complete personal knowledge management system for software engineers. Captures, organizes, and connects technical knowledge — from one-off code snippets to deep architectural understanding — so you can retrieve the right information at the right time instead of relearning the same problems twice.

## TL;DR Checklist

- [ ] Choose an organization framework (PARA recommended) before importing old notes
- [ ] Set up capture inbox that accepts input in under 5 seconds
- [ ] Tag every note with: language, topic, and context tags for searchable retrieval
- [ ] Link related notes using bidirectional links or reference cross-references
- [ ] Schedule weekly review to process inbox and merge duplicate concepts
- [ ] Maintain a "cookbook" of reusable patterns indexed by problem type

---

## When to Use

Use this skill when:

- Setting up a new knowledge management system for yourself or your team
- Your notes are scattered across tools (clipboard, browser tabs, terminal history, chat logs) and you need a single source of truth
- You repeatedly relearn solutions that you already documented but can't find
- Building a code snippet library that's actually searchable and well-organized
- Transitioning from flat note files to a structured knowledge system with linking
- Onboarding new developers and sharing institutional knowledge about codebases

---

## When NOT to Use

Avoid this skill for:

- Managing team-wide documentation — use `writing` skill or dedicated docs platform instead
- Storing sensitive credentials or secrets — use a secret manager, not notes
- Long-form technical writing — PKM is for atomic, retrievable knowledge, not essays
- Temporary scratch work that's immediately consumed and discarded

---

## Core Workflow

### Phase 1: Capture

1. **Capture to Inbox** — When you encounter useful information (error message, solution, pattern), capture it immediately. Do NOT stop what you're doing to organize. Use the fastest input method available.
   **Checkpoint:** The capture action must take ≤5 seconds. If it takes longer, your capture mechanism is too complex.

2. **Add Raw Context** — Immediately add one line of context: what problem did this solve? What language/framework? This prevents the "what was this for?" problem that turns notes into graveyards.
   **Checkpoint:** Every note in your inbox has at minimum: a title, the raw content/code, and one-line context.

### Phase 2: Process

3. **Daily Inbox Sweep** — At end of each day, process inbox items:
   - Delete what's no longer relevant (error already fixed, outdated API)
   - Move useful items to permanent storage under correct PARA category
   - Link to existing notes with related content
   **Checkpoint:** Inbox should be empty by end of processing. No stale items carry over for more than 48 hours.

4. **Atomic Refactoring** — Split merged or verbose notes into atomic concepts. Each note should cover exactly one idea, one pattern, or one solution. If a note is longer than ~20 lines of meaningful content, consider splitting it.
   **Checkpoint:** Each processed note has a single clear topic and can stand alone as a reference.

### Phase 3: Organize

5. **PARA Classification** — File every permanent note under one PARA category:
   - **Projects** — Active work with deadlines (e.g., "auth-migration-api")
   - **Areas** – Ongoing responsibilities requiring maintenance (e.g., "security", "performance-tuning")
   - **Resources** — Reference material for future use (e.g., "database-indexing-strategies")
   - **Archives** — Inactive items from completed projects or obsolete areas
   **Checkpoint:** Each note belongs to exactly one PARA category. If it fits multiple, choose the most time-sensitive one.

6. **Link Construction** — For each permanent note, identify 1–3 existing notes that are conceptually related and create a bidirectional reference. This is what transforms a collection of notes into a knowledge graph.
   **Checkpoint:** Every new permanent note has at least one outgoing link (references others) and one incoming link (is referenced by others).

### Phase 4: Retrieve

7. **Search-First Retrieval** — Before creating a new note, search your PKM using keyword tags and content search. You may already have the answer. If you do, enhance it instead of duplicating it.
   **Checkpoint:** Search returns results within 2 seconds. If not, your indexing/tagging scheme needs improvement.

8. **Cookbook Query Pattern** — Maintain a "cookbook" index file that maps common problems to specific note URIs. This is your fastest retrieval path for frequent tasks.
   **Checkpoint:** Cookbook contains entries for the top 50 most common problem patterns in your work domain.

---

## Implementation Patterns

### Pattern 1: PARA Directory Structure

Organize notes on disk using the PARA framework. This maps cleanly to filesystem hierarchies and works with any tool (plain Markdown files, Obsidian, Logseq, etc.).

```
knowledge-base/
├── 1-Projects/          # Active work with deadlines
│   ├── auth-migration-api.md
│   ├── microservice-refactor.md
│   └── payment-gateway-integration.md
├── 2-Areas/             # Ongoing responsibilities
│   ├── security.md
│   ├── performance-tuning.md
│   └── code-quality.md
├── 3-Resources/         # Reference material for future use
│   ├── database-indexing-strategies.md
│   ├── kubernetes-patterns.md
│   ├── go-concurrency-patterns.md
│   ├── error-handling-in-python.md
│   └── ci-cd-best-practices.md
├── 4-Archives/          # Completed or obsolete items
│   └── legacy-auth-system.md
├── inbox/               # Temporary capture (must be emptied daily)
│   └── .gitkeep
└── _cookbook.md         # Problem → Note URI index (retrieval shortcut)
```

### Pattern 2: Atomic Note Format (BAD vs. GOOD)

```markdown
# ❌ BAD — Merged, vague note covering too much

## Python stuff and some errors

I got this error once about module not found. You can fix it by installing the package. Also here's some code for a function that reads files. And sometimes you need to add sys.path. It's confusing.

```python
def read_file(path):
    with open(path) as f:
        return f.read()
```

## More notes

Also databases are important. SQL vs NoSQL depends on your use case.

---

# ✅ GOOD — Atomic note, one concept, searchable tags

---
title: "ModuleNotFoundError Fix in Python"
tags: [python, debugging, modules, virtual-environment]
created: 2026-05-15
related:
  - "[[Virtual Environments Best Practices]]"
  - "[[Python Dependency Management with Poetry]]"
---

# ModuleNotFoundError Fix in Python

**Problem:** `ModuleNotFoundError: No module named 'xyz'` when running a Python script.

**Root Cause:** The module exists but is not importable from the current working directory or virtual environment path.

## Quick Fixes

### 1. Check Virtual Environment

```bash
# Verify you're in the right venv
which python
python -c "import sys; print(sys.executable)"

# Reinstall dependencies
pip install -r requirements.txt
```

### 2. Add Path Manually (Temporary Workaround)

```python
import sys
from pathlib import Path

project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))
```

**⚠️ Prefer virtual environments over path hacking.** `sys.path` modification is a debugging aid, not a solution.

## Prevention

- Always activate the correct virtual environment before running scripts
- Use `pip freeze > requirements.txt` after installing all dependencies
- Add `.venv/` to your `.gitignore` and project-level PATH setup files

**See also:** [Virtual Environments Best Practices] — proper venv setup, [Python Dependency Management with Poetry] — modern dependency workflows

```

### Pattern 3: Automated Tag Extraction Script

Shell script to scan notes and generate a tag index for fast search without a full-text engine.

```bash
#!/usr/bin/env bash
# extract-tags.sh — Scans all .md files in PKM and outputs a searchable tag→file mapping
set -euo pipefail

PKM_ROOT="${1:-knowledge-base/3-Resources}"
INDEX_FILE="${2:-tag-index.txt}"

echo "# Auto-generated tag index — $(date +%Y-%m-%d)" > "$INDEX_FILE"
echo "# Format: #tag → file1, file2" >> "$INDEX_FILE"
echo "" >> "$INDEX_FILE"

# Extract all tags from frontmatter and inline tags, count occurrences
find "$PKM_ROOT" -name '*.md' -print0 | xargs -0 \
  grep -hoP '(?:tags: \[|\#\K[a-zA-Z][a-zA-Z0-9_-]*)' \
  | sort | uniq -c | sort -rn > "${INDEX_FILE}.counts"

# Build the index with file paths
while IFS= read -r line; do
  count=$(echo "$line" | awk '{print $1}')
  tag=$(echo "$line" | awk '{$1=""; print $0}' | xargs)
  
  files=$(grep -rl "tags:.*$tag\|#$tag" "$PKM_ROOT" --include='*.md' 2>/dev/null \
    | sed "s|$PKM_ROOT/||" | head -5 | tr '\n' ', ' | sed 's/,$//')
  
  echo "#${tag} (${count}) → ${files}" >> "$INDEX_FILE"
done < "${INDEX_FILE}.counts"

rm -f "${INDEX_FILE}.counts"
echo "✓ Tag index written to $INDEX_FILE"
```

### Pattern 4: Cookbook Index Template

The cookbook is a single-file problem lookup that maps common tasks to your atomic notes.

```markdown
---
title: Developer Cookbook
description: Problem → solution note mapping for fast retrieval during coding sessions
last-updated: 2026-05-19
---

# Developer Cookbook

Quick reference: search by problem keyword, find the note that has the detailed answer.

## Python / Language Issues

| Problem | Note URI | Priority |
|---------|----------|----------|
| `ModuleNotFoundError` | `3-Resources/error-handling-in-python.md::fix-module-not-found` | 🔴 High |
| Circular import errors | `3-Resources/error-handling-in-python.md::fix-circular-imports` | 🟡 Medium |
| Type hinting generics | `3-Resources/go-concurrency-patterns.md::type-hints-reference` | 🟢 Low |

## Database / Data Layer

| Problem | Note URI | Priority |
|---------|----------|----------|
| Slow query optimization | `3-Resources/database-indexing-strategies.md::slow-query-diagnosis` | 🔴 High |
| Connection pool exhaustion | `3-Resources/database-indexing-strategies.md::connection-pool-tuning` | 🟡 Medium |
| Migration rollback strategy | `3-Resources/database-indexing-strategies.md::migration-rollback` | 🔴 High |

## Infrastructure / Deployment

| Problem | Note URI | Priority |
|---------|----------|----------|
| Pod restart loop (CrashLoopBackOff) | `3-Resources/kubernetes-patterns.md::crashloop-diagnosis` | 🔴 High |
| Memory limit tuning | `3-Resources/kubernetes-patterns.md::resource-limits` | 🟡 Medium |
| Health check misconfiguration | `3-Resources/kubernetes-patterns.md::health-check-setup` | 🔴 High |

## Code Quality / Development Workflow

| Problem | Note URI | Priority |
|---------|----------|----------|
| Flaky test identification | `_recipes/flaky-tests.md` | 🟡 Medium |
| PR review checklist automation | `_recipes/pr-checklist-automation.md` | 🟢 Low |

```

---

## Constraints

### MUST DO
- Capture to inbox immediately; never skip capture to organize first
- Each atomic note must have at least one tag and one related-note link
- PARA categories are mutually exclusive — each permanent note lives in exactly one folder
- Cookbook entries must point to specific sections within notes (using heading anchors)
- Process inbox within 24 hours; stale items degrade system trust
- Weekly review: delete obsolete items, merge duplicates, update cookbook

### MUST NOT DO
- Merge unrelated concepts into a single note — this is the #1 cause of PKM decay
- Store credentials, API keys, or secrets in notes — use a dedicated secret manager
- Use PARA categories for temporary scratch work — inbox exists for that purpose
- Spend more than 2 minutes organizing a new note — tagging + linking is sufficient
- Build an elaborate note structure upfront — let it emerge organically from actual usage

---

## Tool Implementation Patterns

### Pattern 5: Obsidian Vault Configuration (JSON)

```jsonc
{
  "id": "developer-pkm",
  "name": "Developer PKM",
  "plugins": {
    "core": ["file-explorer", "global-search", "command-palette", "backlink"],
    "community": [
      "templater",       // Auto-generate note frontmatter on creation
      "dataview",        // Query notes by tags, dates, links (like SQL for notes)
      "periodic-notes"   // Daily inbox and weekly review templates
    ]
  },
  "communityPluginAutoApprove": true,
  "hotkeys": {
    "Quick Capture": ["Ctrl+Shift+N"],
    "Open Daily Note": ["Ctrl+Alt+D"],
    "Toggle Backlinks": ["Ctrl+Shift+B"]
  }
}
```

### Pattern 6: Templater Templates for Note Creation

```python
# Template: new-note.py → renders when you create a note in your PKM
# (Compatible with Obsidian Templater plugin or any Markdown template system)

"""
Generated by developer-pkm template engine.
Template variables are populated at creation time.
"""

return f"""---
title: "{note_title}"
tags: [{', '.join(note_tags)}]
created: {date_created}
status: active  # options: draft, active, archived
related: []
---

# {note_title}

<!-- One-line context: what problem does this solve? -->
**Problem:** 

## Solution

## Code Example

```python
# Your code here with typed signatures and docstrings
```

## References

<!-- Link to related notes using bidirectional syntax -->
- [[{{related_note_1}}]]
"""
```

### Pattern 7: Search Script for Fast Content Retrieval

```bash
#!/usr/bin/env bash
# pkm-search.sh — Full-text search across all PKM notes with context lines
set -euo pipefail

PKM_ROOT="${1:-knowledge-base/}"
QUERY="$2"
CONTEXT_LINES="${3:-3}"

if [[ -z "$QUERY" ]]; then
  echo "Usage: $0 <query> [context-lines]" >&2
  exit 1
fi

# Search with ripgrep for fast full-text matching across markdown files
rg --type-add 'md:*.md' \
   --type-set md \
   -A "$CONTEXT_LINES" -B 2 \
   --color=always \
   --glob '!tag-index.txt' \
   --glob '!_cookbook.md' \
   "$QUERY" "$PKM_ROOT" 2>/dev/null | \
  head -100
```

Usage: `./pkm-search.sh "connection pool exhausted" 5`

---

## Output Template

When applying this skill to set up or audit a PKM system, produce:

1. **Structure Assessment** — Current note organization method and its gaps (what's missing or broken)
2. **PARA Mapping** — Proposed folder structure with example categorizations for the user's specific domain
3. **Capture Mechanism** — Recommended fastest-capture tool/setup for the user's workflow (CLI, editor plugin, Obsidian quick capture, etc.)
4. **Cookbook Skeleton** — Initial problem-to-note mapping with at least 10 entries tailored to their work
5. **Automation Script** — Custom search or tag-extraction script adapted to their note format and storage location

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `test-driven-development` | PKM feeds TDD by storing test patterns, edge case libraries, and assertion strategies you can reuse |
| `refactoring` | Refactoring notes live in Resources; the cookbook maps anti-patterns to specific refactor approaches |
| `code-review` | Review checklists and common code-smell patterns are stored as PKM notes for quick reference during PR reviews |
| `writing` | Use this skill alongside writing guidelines to produce clean, well-structured technical documentation from your PKM notes |

---

## Maintenance Routines

### Daily (2 minutes)
1. Empty inbox: delete noise, process useful items into PARA folders
2. Link 1–3 connections for the day's new notes
3. Add any new patterns to the cookbook

### Weekly (10 minutes)
1. Review all tags — remove stale ones, consolidate overlapping ones
2. Check for orphaned notes (no incoming or outgoing links) and fix them
3. Archive completed project notes
4. Update cookbook with newly encountered problem patterns

### Monthly (30 minutes)
1. Full-text search audit: look for duplicate concepts across multiple notes and merge where appropriate
2. Review cookbook completeness — are the top 50 problems still accurately mapped?
3. Benchmark retrieval speed: pick 5 random problems, time how long it takes to find the answer

---

## Domain-Specific Tips

### For Backend Engineers
- Tag database-related notes with both `database` and the specific engine (`postgresql`, `redis`, `mongodb`) — you'll search by one or the other depending on context
- Store migration rollback procedures in Projects (active) not Resources (they're needed immediately when things break)

### For Frontend Engineers
- Organize component patterns by framework version (React 19 vs. React 18 have different hooks APIs)
- Keep CSS/styling snippets in a separate sub-directory under Resources — they mix poorly with logic notes

### For DevOps / Platform Engineers
- Tag infrastructure notes with cloud provider (`aws`, `gcp`) and service type (`compute`, `networking`, `storage`)
  - Cookbook entries for on-call runbooks should include severity levels and escalation paths

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Zettelkasten Method — Original Introduction by Niklas Luhmann](https://www.zettelkasten.de/introduction/)
- [Obsidian Help — Getting Started with Second Brain](https://obsidian.md/learn/getting-started)
- [PARA Method by Tiago Forte — Core Organization Framework](https://fortelabs.com/blog/para/)
- [Building a Second Brain by Tiago Forte (Book Summary & Notes)](https://tiagoforte.com/book/building-a-second-brain/)
- [Obsidian API Documentation for Plugin Developers](https://help.obsidian.md/Extending+obsidian/Obsidian+API)
